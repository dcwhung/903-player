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
import {
    CATALOG_IMAGE_PATH,
    CATALOG_JSON_KEY,
    IMAGE_FILE_PATTERN,
    VALIDATION_APP_AUDIO_BASE,
} from '../config';
import { sha256Hex } from '../lib/crypto';
import { purgeCatalogCache } from './serve';
import {
    deletePublish,
    insertPublish,
    latestPublish,
    type EntryRow,
    type LatestPublish,
    type PublishRow,
} from './store';

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
    | { kind: 'published'; publish: PublishRow }
    /** 除 generatedAt 外同最新一次一樣：唔開新行、唔寫 R2（S-780） */
    | { kind: 'unchanged'; publish: PublishRow }
    | { kind: 'rejected'; missing: string[] };

const parseJson = (text: string, what: string): Record<string, unknown> => {
    try {
        return JSON.parse(text) as Record<string, unknown>;
    } catch {
        throw new PublishValidationError(`${what}: invalid JSON`);
    }
};

/**
 * 圖 manifest（檔名 → R2 圖檔名）→ 檔名 → Worker 圖 URL。圖檔名要合 <hash>.<ext>（S-772），
 * 而且 hash 已經上載（喺 assets）
 */
export const resolveImages = (
    files: Readonly<Record<string, unknown>>,
    where: string,
    { origin, assets }: { origin: string; assets: ReadonlySet<string> },
): Record<string, string> =>
    Object.fromEntries(
        Object.entries(files).map(([file, value]) => {
            const name = String(value);
            if (!IMAGE_FILE_PATTERN.test(name))
                throw new PublishValidationError(
                    `${where}: image ${file} → ${name} is not <hash>.<ext>`,
                );
            if (!assets.has(name.split('.')[0] ?? ''))
                throw new PublishValidationError(`${where}: image ${file} → ${name} not uploaded`);
            return [file, `${origin}${CATALOG_IMAGE_PATH}${name}`];
        }),
    );

const imageUrls = (row: EntryRow, origin: string, assets: ReadonlySet<string>) => {
    const where = `${row.kind}/${row.id}`;
    return resolveImages(parseJson(row.images, `${where} images`), where, { origin, assets });
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

/** 除 generatedAt 外完全一樣（document 都係由同一個 builder JSON.stringify，key 次序穩定） */
const sameContent = (previous: string, next: string): boolean => {
    const strip = (json: string) =>
        JSON.stringify({ ...(JSON.parse(json) as Record<string, unknown>), generatedAt: null });
    return strip(previous) === strip(next);
};

type PublishEnv = { DB: D1Database; CATALOG: R2Bucket; WORKER_ORIGIN: string };

/** 先記 publishes 後寫 R2：R2 寫失敗就刪返嗰行，ID 守衛唔會漏咗今次嘅 ID（S-767） */
const writePublish = async (
    env: PublishEnv,
    { doc, json, episodeIds }: ValidatedDocument,
    { createdBy, rollbackOf }: { createdBy: string; rollbackOf: number | null },
): Promise<PublishRow> => {
    const hash = await sha256Hex(json);
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
    try {
        await env.CATALOG.put(CATALOG_JSON_KEY, json, {
            httpMetadata: { contentType: 'application/json; charset=utf-8' },
            customMetadata: { hash },
        });
    } catch (error) {
        await deletePublish(env.DB, publish.id);
        throw error;
    }
    return publish;
};

const guard = (
    latest: LatestPublish | null,
    { json, episodeIds }: ValidatedDocument,
    force: boolean,
): PublishOutcome | undefined => {
    if (force || !latest) return undefined;
    const missing = missingEpisodeIds(latest.episodeIds, episodeIds);
    if (missing.length > 0) return { kind: 'rejected', missing };
    return sameContent(latest.document, json)
        ? { kind: 'unchanged', publish: latest.row }
        : undefined;
};

/**
 * 驗過嘅 document 寫 R2 + 記 publishes。冇 force 時：ID 守衛唔過就乜都唔寫；
 * 內容同最新一次一樣就回 unchanged（唔開新行、唔寫 R2）
 */
export const commitPublish = async (
    env: PublishEnv,
    validated: ValidatedDocument,
    {
        createdBy,
        force,
        rollbackOf,
    }: { createdBy: string; force: boolean; rollbackOf: number | null },
): Promise<PublishOutcome> => {
    const skipped = guard(await latestPublish(env.DB), validated, force);
    if (skipped) return skipped;
    const publish = await writePublish(env, validated, { createdBy, rollbackOf });
    await purgeCatalogCache(env.WORKER_ORIGIN);
    return { kind: 'published', publish };
};
