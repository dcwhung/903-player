/*
 * /api/entries：admin 直接改 D1 內容（Phase 3 admin 用）。
 * 樂觀鎖：PUT 要帶 If-Match（新增用 If-None-Match: *），唔對 → 412；驗證同 publish 同一套 → 422；
 * 回應附 warnings：同最新 publish 比會消失嘅 episode ID（真正守門仍然係 publish ID 守衛）
 */
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';
import { missingEpisodeIds } from '../catalog/publish';
import {
    deleteEntry,
    getEntry,
    insertEntryStatement,
    latestPublish,
    listAssetHashes,
    listStoredEntries,
    updateEntryStatement,
    type EntryRow,
    type StoredEntry,
} from '../catalog/store';
import { etagOf, expectedVersion, ifMatches, nextUpdatedAt } from './etag';
import {
    badTarget,
    errorResponse,
    isRecord,
    preconditionFailed,
    readJsonObject,
    targetOf,
    type Json,
} from './http';
import { EntryValidationError, validateEntry, type EntryInput } from './validate';

export const entryRoutes = new Hono<AppEnv>();

const summaryOf = (row: StoredEntry) => {
    const definition = JSON.parse(row.definition) as Json;
    return {
        kind: row.kind,
        id: row.id,
        name: definition.name,
        // 節目 enabled 冇寫 = 上架
        enabled: definition.enabled ?? true,
        draft: row.draft === 1,
        updatedAt: row.updated_at,
    };
};

entryRoutes.get('/entries', async (c) =>
    c.json({ entries: (await listStoredEntries(c.env.DB)).map(summaryOf) }),
);

entryRoutes.get('/entries/:kind/:id', async (c) => {
    const target = targetOf(c);
    if (!target) return badTarget(c);
    const row = await getEntry(c.env.DB, target.kind, target.id);
    if (!row) return errorResponse(c, HTTP_STATUS.notFound, 'no such entry');
    const body = {
        definition: JSON.parse(row.definition) as Json,
        images: JSON.parse(row.images) as Json,
    };
    return c.json({ ...body, draft: row.draft === 1, updatedAt: row.updated_at }, HTTP_STATUS.ok, {
        etag: etagOf(row.updated_at),
    });
});

/** 最新 publish 有、新 definition 冇嘅呢個劇嘅 episode ID（節目冇 episode ID） */
export const disappearingIds = async (
    db: D1Database,
    entry: EntryInput,
    ids: readonly string[],
) => {
    if (entry.kind !== 'dramas') return [];
    const prefix = `drama:${entry.id}:`;
    const published = (await latestPublish(db))?.episodeIds ?? [];
    return missingEpisodeIds(
        published.filter((id) => id.startsWith(prefix)),
        ids,
    );
};

const validationFailed = (c: Context<AppEnv>, error: unknown) => {
    if (!(error instanceof EntryValidationError)) throw error;
    return errorResponse(c, HTTP_STATUS.unprocessable, 'validation failed', {
        details: error.message,
    });
};

/**
 * 驗證（draft 先試完整驗證，唔過再用寬鬆驗證）+ 計 warning；唔合格 → 422 response。
 * 回傳嘅 draft = 存入去之後仲係唔係 draft（完整驗證過咗就自動清）
 */
export const checkedEntry = async (c: Context<AppEnv>, entry: EntryInput, wasDraft = false) => {
    const context = { origin: c.env.WORKER_ORIGIN, assets: await listAssetHashes(c.env.DB) };
    let ids: string[];
    let draft = false;
    try {
        ids = validateEntry(entry, context);
    } catch (error) {
        if (!wasDraft) return validationFailed(c, error);
        try {
            ids = validateEntry(entry, context, { relaxed: true });
            draft = true;
        } catch (relaxedError) {
            return validationFailed(c, relaxedError);
        }
    }
    return { warnings: { missingEpisodeIds: await disappearingIds(c.env.DB, entry, ids) }, draft };
};

export const rowOf = (entry: EntryInput): EntryRow => ({
    kind: entry.kind,
    id: entry.id,
    definition: JSON.stringify(entry.definition),
    images: JSON.stringify(entry.images),
});

/** If-None-Match: * = 新增（唔可以已經有）；If-Match = 更新（要對到）；唔啱 → undefined（412） */
const writeMode = (c: Context<AppEnv>, existing: StoredEntry | null) => {
    if (c.req.header('if-none-match')?.trim() === '*') return existing ? undefined : 'create';
    const ok = existing && ifMatches(c.req.header('if-match'), existing.updated_at);
    return ok ? 'update' : undefined;
};

const inputOf = async (c: Context<AppEnv>, target: { kind: EntryInput['kind']; id: string }) => {
    const body = await readJsonObject(c);
    if (!body || !isRecord(body.definition) || !isRecord(body.images)) return undefined;
    return { ...target, definition: body.definition, images: body.images };
};

const save = async (
    c: Context<AppEnv>,
    entry: EntryInput,
    { existing, draft }: { existing: StoredEntry | null; draft: boolean },
) => {
    const updatedAt = nextUpdatedAt(existing?.updated_at);
    const row = rowOf(entry);
    const statement = existing
        ? updateEntryStatement(c.env.DB, row, { expected: existing.updated_at, updatedAt, draft })
        : insertEntryStatement(c.env.DB, row, updatedAt);
    const result = await statement.run();
    return result.meta.changes > 0 ? updatedAt : undefined;
};

entryRoutes.put('/entries/:kind/:id', async (c) => {
    const target = targetOf(c);
    if (!target) return badTarget(c);
    const entry = await inputOf(c, target);
    if (!entry)
        return errorResponse(c, HTTP_STATUS.badRequest, 'body must be { definition, images }');
    const existing = await getEntry(c.env.DB, target.kind, target.id);
    const mode = writeMode(c, existing);
    if (!mode) return preconditionFailed(c);
    // 新增一律完整驗證（draft 只係掃描自動建）
    const checked = await checkedEntry(c, entry, mode === 'update' && existing?.draft === 1);
    if (checked instanceof Response) return checked;
    const { warnings, draft } = checked;
    const updatedAt = await save(c, entry, {
        existing: mode === 'update' ? existing : null,
        draft,
    });
    if (!updatedAt) return preconditionFailed(c);
    const status = mode === 'create' ? HTTP_STATUS.created : HTTP_STATUS.ok;
    return c.json({ updatedAt, draft, warnings }, status, { etag: etagOf(updatedAt) });
});

/** 最新 publish 有冇用緊：劇集睇 episode ID，節目睇 document 有冇佢 */
const isPublished = async (db: D1Database, kind: EntryInput['kind'], id: string) => {
    const latest = await latestPublish(db);
    if (!latest) return false;
    if (kind === 'dramas') return latest.episodeIds.some((e) => e.startsWith(`drama:${id}:`));
    const shows = (JSON.parse(latest.document) as { shows?: { id: string }[] }).shows ?? [];
    return shows.some((show) => show.id === id);
};

entryRoutes.delete('/entries/:kind/:id', async (c) => {
    const target = targetOf(c);
    if (!target) return badTarget(c);
    const existing = await getEntry(c.env.DB, target.kind, target.id);
    if (!existing) return errorResponse(c, HTTP_STATUS.notFound, 'no such entry');
    const expected = expectedVersion(c.req.header('if-match'));
    if (expected !== null && expected !== existing.updated_at) return preconditionFailed(c);
    if (await isPublished(c.env.DB, target.kind, target.id))
        return errorResponse(
            c,
            HTTP_STATUS.conflict,
            'published entries cannot be deleted; set enabled: false instead',
        );
    const deleted = await deleteEntry(c.env.DB, { ...target, expected: existing.updated_at });
    return deleted ? c.body(null, HTTP_STATUS.noContent) : preconditionFailed(c);
});
