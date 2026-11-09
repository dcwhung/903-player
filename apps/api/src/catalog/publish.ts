/*
 * Publish：D1 entries → CatalogDocument → packages/catalog 同一套 validator → ID 守衛 → R2 + publishes 記錄。
 * 最高原則：episode ID 唔准無聲無息消失（用戶進度 / 收藏靠佢），所以上次有、今次冇就拒絕，要 force 先得
 */
import {
    buildRegistry,
    buildShowRegistry,
    CATALOG_SCHEMA_VERSION,
    documentSource,
    parseCatalogDocument,
    type CatalogDocument,
    type CatalogEntry,
} from '@903-player/catalog';
import { CATALOG_IMAGE_PATH, CATALOG_JSON_KEY, VALIDATION_APP_AUDIO_BASE } from '../config';
import { sha256Hex } from '../lib/crypto';
import { purgeCatalogCache } from './serve';
import { insertPublish, latestEpisodeIds, type EntryRow, type PublishRow } from './store';

/** 驗證失敗（definition / 圖）：422，乜都唔寫 */
export class PublishValidationError extends Error {
    override readonly name = 'PublishValidationError';
}

export interface ValidatedDocument {
    doc: CatalogDocument;
    /** 寫入 R2 嘅 JSON（由原本 value stringify；還原時同舊 snapshot 一個 byte 都唔差） */
    json: string;
    episodeIds: string[];
}

export type PublishOutcome =
    { kind: 'published'; publish: PublishRow } | { kind: 'rejected'; missing: string[] };

const parseJson = (text: string, what: string): Record<string, unknown> => {
    try {
        return JSON.parse(text) as Record<string, unknown>;
    } catch {
        throw new PublishValidationError(`${what}: invalid JSON`);
    }
};

const imageUrls = (row: EntryRow, origin: string, assets: ReadonlySet<string>) => {
    const files = parseJson(row.images, `${row.kind}/${row.id} images`);
    return Object.fromEntries(
        Object.entries(files).map(([file, name]) => {
            const hash = String(name).split('.')[0] ?? '';
            if (!assets.has(hash)) {
                throw new PublishValidationError(
                    `${row.kind}/${row.id}: image ${file} → ${String(name)} not uploaded`,
                );
            }
            return [file, `${origin}${CATALOG_IMAGE_PATH}${String(name)}`];
        }),
    );
};

/** D1 rows → catalog.json 內容（未驗證） */
export const documentFromEntries = (
    rows: readonly EntryRow[],
    {
        origin,
        assets,
        generatedAt,
    }: { origin: string; assets: ReadonlySet<string>; generatedAt: string },
): unknown => {
    const entriesOf = (kind: EntryRow['kind']): CatalogEntry[] =>
        rows
            .filter((row) => row.kind === kind)
            .map((row) => ({
                id: row.id,
                definition: parseJson(row.definition, `${kind}/${row.id} definition`),
                images: imageUrls(row, origin, assets),
            }));
    return {
        schemaVersion: CATALOG_SCHEMA_VERSION,
        generatedAt,
        shows: entriesOf('shows'),
        dramas: entriesOf('dramas'),
    };
};

/** 同 player 一樣：parse + 兩個 registry 都 build 到先算合格；順手計晒 episode ID */
export const validateDocument = (value: unknown): ValidatedDocument => {
    try {
        const doc = parseCatalogDocument(value);
        const dramas = buildRegistry(documentSource(doc, 'dramas'), {
            appAudioBase: VALIDATION_APP_AUDIO_BASE,
        });
        buildShowRegistry(documentSource(doc, 'shows'));
        const episodeIds = dramas.dramas.flatMap((d) =>
            dramas.catalogEpisodesOf(d.id).map((e) => e.id),
        );
        return { doc, json: JSON.stringify(value), episodeIds };
    } catch (error) {
        if (error instanceof PublishValidationError) throw error;
        throw new PublishValidationError(error instanceof Error ? error.message : String(error));
    }
};

/** 上次有、今次冇嘅 ID（ID 守衛） */
export const missingEpisodeIds = (
    previous: readonly string[],
    next: readonly string[],
): string[] => {
    const current = new Set(next);
    return previous.filter((id) => !current.has(id));
};

/** 驗過嘅 document 寫 R2 + 記 publishes；ID 守衛唔過（又冇 force）就乜都唔寫 */
export const commitPublish = async (
    env: { DB: D1Database; CATALOG: R2Bucket; WORKER_ORIGIN: string },
    { doc, json, episodeIds }: ValidatedDocument,
    {
        createdBy,
        force,
        rollbackOf,
    }: { createdBy: string; force: boolean; rollbackOf: number | null },
): Promise<PublishOutcome> => {
    const missing = missingEpisodeIds(await latestEpisodeIds(env.DB), episodeIds);
    if (missing.length > 0 && !force) return { kind: 'rejected', missing };
    const hash = await sha256Hex(json);
    await env.CATALOG.put(CATALOG_JSON_KEY, json, {
        httpMetadata: { contentType: 'application/json; charset=utf-8' },
        customMetadata: { hash },
    });
    await purgeCatalogCache(env.WORKER_ORIGIN);
    const publish = await insertPublish(env.DB, {
        createdAt: new Date().toISOString(),
        createdBy,
        hash,
        document: json,
        episodeIds,
        showCount: doc.shows.length,
        dramaCount: doc.dramas.length,
        episodeCount: episodeIds.length,
        rollbackOf,
    });
    return { kind: 'published', publish };
};
