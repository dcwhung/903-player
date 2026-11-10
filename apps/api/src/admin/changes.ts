/*
 * 變更摘要（packages/catalog summarizeChanges）：
 * - GET /api/changes：而家 D1（唔包 draft）vs 最新 ok publish → 時間線 + 驗證結果（admin 確認發佈頁一次 call）
 * - publishChanges：每次 publish 同佢之前最近一次 ok publish 比（GET /api/publishes 嘅 changes）
 */
import {
    hkToday,
    summarizeChanges,
    type CatalogEntry,
    type ChangeDocument,
    type ChangeSummary,
} from '@903-player/catalog';
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { CATALOG_IMAGE_PATH } from '../config';
import { documentFromEntries, PublishValidationError, validateDocument } from '../catalog/publish';
import {
    latestPublish,
    listAssetHashes,
    listEntries,
    type EntryRow,
    type PublishRow,
} from '../catalog/store';
import type { Json } from '../content/http';

export const changeRoutes = new Hono<AppEnv>();

const parseObject = (text: string): Json => {
    try {
        const value: unknown = JSON.parse(text);
        return typeof value === 'object' && value !== null && !Array.isArray(value)
            ? (value as Json)
            : {};
    } catch {
        return {};
    }
};

/**
 * 比較用 document：圖 URL 照 publish 嘅格式砌（同已發佈嗰份比先唔會次次當改咗圖），
 * 但唔驗圖（驗證另外做，唔合格都要比較得）
 */
export const previewDocument = (rows: readonly EntryRow[], origin: string): ChangeDocument => {
    const entriesOf = (kind: EntryRow['kind']): CatalogEntry[] =>
        rows
            .filter((row) => row.kind === kind)
            .map((row) => ({
                id: row.id,
                definition: parseObject(row.definition),
                images: Object.fromEntries(
                    Object.entries(parseObject(row.images)).map(([file, name]) => [
                        file,
                        `${origin}${CATALOG_IMAGE_PATH}${String(name)}`,
                    ]),
                ),
            }));
    return { shows: entriesOf('shows'), dramas: entriesOf('dramas') };
};

/** catalog.json 全文 → 比較用 document（壞咗當空） */
export const publishedDocument = (json: string): ChangeDocument => {
    const value = parseObject(json);
    const list = (key: string) => (Array.isArray(value[key]) ? (value[key] as CatalogEntry[]) : []);
    return { shows: list('shows'), dramas: list('dramas') };
};

type Validation = { ok: true; episodeCount: number } | { ok: false; error: string };

const validationOf = (
    rows: readonly EntryRow[],
    context: { origin: string; assets: ReadonlySet<string> },
): Validation => {
    try {
        const generatedAt = new Date().toISOString();
        const { listedEpisodeIds } = validateDocument(
            documentFromEntries(rows, { ...context, generatedAt }),
        );
        return { ok: true, episodeCount: listedEpisodeIds.length };
    } catch (error) {
        if (!(error instanceof PublishValidationError)) throw error;
        return { ok: false, error: error.message };
    }
};

changeRoutes.get('/changes', async (c) => {
    const [rows, latest, assets] = await Promise.all([
        listEntries(c.env.DB),
        latestPublish(c.env.DB),
        listAssetHashes(c.env.DB),
    ]);
    const origin = c.env.WORKER_ORIGIN;
    const changes = summarizeChanges(
        latest ? publishedDocument(latest.document) : null,
        previewDocument(rows, origin),
        hkToday(),
    );
    return c.json({
        base: latest?.row.id ?? null,
        changes,
        validation: validationOf(rows, { origin, assets }),
    });
});

/** 每行 publish 同佢之前最近一次 ok publish 比（rows 新到舊；documents = id → catalog.json） */
export const publishChanges = (
    rows: readonly PublishRow[],
    documents: ReadonlyMap<number, string>,
): Map<number, ChangeSummary> => {
    const summaries = new Map<number, ChangeSummary>();
    rows.forEach((row, i) => {
        const previous = rows.slice(i + 1).find((older) => older.status === 'ok');
        const before = previous ? documents.get(previous.id) : undefined;
        const after = documents.get(row.id) ?? '{}';
        const today = hkToday(new Date(row.created_at));
        const options = { rollbackOf: row.rollback_of };
        summaries.set(
            row.id,
            summarizeChanges(
                before === undefined ? null : publishedDocument(before),
                publishedDocument(after),
                today,
                options,
            ),
        );
    });
    return summaries;
};
