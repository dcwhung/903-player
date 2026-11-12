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
    VALIDATION_BUILD_OPTIONS,
} from '../config';
import type { BannerImages } from '../banner/store';
import { sha256Hex } from '../lib/crypto';
import { purgeCatalogCache } from './serve';
import { publishWarnings, type PublishWarning } from './warnings';
import {
    deletePublish,
    insertPublish,
    latestPublish,
    markPublishFailed,
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
    /** 全部 episode ID（連下架劇 / 短篇）：同上次比（ID 守衛），落架唔當消失 */
    episodeIds: string[];
    /** player 睇到嘅 episode ID（劇 enabled、短篇冇下架）：上過架先鎖入守衛（W-707） */
    listedEpisodeIds: string[];
    /** 唔阻 publish 嘅警告（theme contrast、未設定配色） */
    warnings: PublishWarning[];
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

export interface DocumentContext {
    origin: string;
    assets: ReadonlySet<string>;
    generatedAt: string;
    /** D1 banner（null = 還原預設，catalog.json 冇 banner）；必填，免得有 caller 漏咗 */
    banner: BannerImages | null;
}

/** banner 兩張圖 → Worker 圖 URL（同 entries 圖一樣要已上載） */
const bannerUrls = (
    banner: BannerImages | null,
    context: { origin: string; assets: ReadonlySet<string> },
) =>
    banner === null
        ? {}
        : {
              banner: resolveImages(
                  { standard: banner.standard, long: banner.long },
                  'banner',
                  context,
              ),
          };

/** D1 rows（+ banner）→ catalog.json 內容（未驗證） */
export const documentFromEntries = (
    rows: readonly EntryRow[],
    { origin, assets, generatedAt, banner }: DocumentContext,
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
        ...bannerUrls(banner, { origin, assets }),
    };
};

/** 同 player 一樣（唔包下架短篇）砌 registry，淨係計上架劇嘅集數 */
const listedIdsOf = (doc: CatalogDocument): string[] => {
    const player = buildRegistry(documentSource(doc, 'dramas'), {
        appAudioBase: VALIDATION_BUILD_OPTIONS.appAudioBase,
    });
    return player.dramas
        .filter((d) => d.enabled)
        .flatMap((d) => player.catalogEpisodesOf(d.id).map((e) => e.id));
};

/**
 * 寫入 publishes.episode_ids 嘅「鎖住」ID：今次上架緊嘅 + 以前鎖咗而今次仲喺 document（落咗架都照鎖）。
 * 從未上過架嘅（例如掃描出嚟、未排期嘅 placeholder arc-01 / drama-01）唔鎖，改 ID 唔使 force（W-707）
 */
export const lockedEpisodeIds = (
    latest: LatestPublish | null,
    { episodeIds, listedEpisodeIds }: ValidatedDocument,
): string[] => {
    const present = new Set(episodeIds);
    const locked = new Set([
        ...listedEpisodeIds,
        ...(latest?.episodeIds ?? []).filter((id) => present.has(id)),
    ]);
    return episodeIds.filter((id) => locked.has(id));
};

/** 同 player 一樣：parse + 兩個 registry 都 build 到先算合格；順手計晒 episode ID */
export const validateDocument = (value: unknown): ValidatedDocument => {
    try {
        const doc = parseCatalogDocument(value);
        const dramas = buildRegistry(documentSource(doc, 'dramas'), VALIDATION_BUILD_OPTIONS);
        buildShowRegistry(documentSource(doc, 'shows'));
        const episodeIds = dramas.dramas.flatMap((d) =>
            dramas.catalogEpisodesOf(d.id).map((e) => e.id),
        );
        return {
            doc,
            json: JSON.stringify(value),
            episodeIds,
            listedEpisodeIds: listedIdsOf(doc),
            warnings: publishWarnings(doc),
        };
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

/**
 * R2 寫失敗後收拾嗰行：刪走（S-767）；連刪都失敗就標 failed（S-786），
 * 唔係就會被當做最新一次，同內容再 publish 會判 unchanged，R2 永遠唔更新
 */
const discardPublish = async (db: D1Database, id: number, reason: string): Promise<void> => {
    try {
        await deletePublish(db, id);
    } catch {
        // 標都標唔到：照 throw 返原本 R2 錯誤，呢度只留 log 俾 Workers Logs 追查
        await markPublishFailed(db, id, reason).catch((error: unknown) =>
            console.error(`publish ${id}: could not drop or mark failed`, error),
        );
    }
};

const messageOf = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

/** 寫 R2 catalog.json；失敗就收拾返啱啱記嗰行再 throw */
const putCatalogJson = async (
    env: PublishEnv,
    publishId: number,
    { json, hash }: { json: string; hash: string },
): Promise<void> => {
    try {
        await env.CATALOG.put(CATALOG_JSON_KEY, json, {
            httpMetadata: { contentType: 'application/json; charset=utf-8' },
            customMetadata: { hash },
        });
    } catch (error) {
        await discardPublish(env.DB, publishId, messageOf(error));
        throw error;
    }
};

/** 先記 publishes 後寫 R2：R2 寫失敗就收拾返嗰行，ID 守衛唔會漏咗今次嘅 ID（S-767） */
const writePublish = async (
    env: PublishEnv,
    { doc, json, listedEpisodeIds }: ValidatedDocument,
    {
        createdBy,
        rollbackOf,
        locked,
    }: { createdBy: string; rollbackOf: number | null; locked: string[] },
): Promise<PublishRow> => {
    const hash = await sha256Hex(json);
    const publish = await insertPublish(env.DB, {
        createdAt: new Date().toISOString(),
        createdBy,
        hash,
        document: json,
        episodeIds: locked,
        showCount: doc.shows.length,
        dramaCount: doc.dramas.length,
        episodeCount: listedEpisodeIds.length,
        rollbackOf,
    });
    await putCatalogJson(env, publish.id, { json, hash });
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
 * R2 已經寫咗先 purge：失敗只 log、唔 throw（S-814）。throw 會令還原 revert D1，
 * 但 R2 已經係新版，D1 同已上線 catalog 就唔夾；edge cache 最多過咗 max-age 自己更新
 */
const purgeAfterWrite = async (origin: string, publishId: number): Promise<void> => {
    try {
        await purgeCatalogCache(origin);
    } catch (error) {
        console.error(`publish ${publishId}: could not purge the catalog cache`, error);
    }
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
    const latest = await latestPublish(env.DB);
    const skipped = guard(latest, validated, force);
    if (skipped) return skipped;
    const locked = lockedEpisodeIds(latest, validated);
    const publish = await writePublish(env, validated, { createdBy, rollbackOf, locked });
    await purgeAfterWrite(env.WORKER_ORIGIN, publish.id);
    return { kind: 'published', publish };
};
