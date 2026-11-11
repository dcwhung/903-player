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
    listScheduledArcIds,
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
 * 可唔可以寬鬆驗證：掃描建嘅 draft 劇（上架都得：排程可以同時轉上架，圖喺待辦跟）；
 * 或者下架嘅 entry（admin 新建節目 / 劇，圖未齊）。上架嘅節目一定要完整驗證（圖要齊）
 */
const mayRelax = (entry: EntryInput, wasDraft: boolean) =>
    (wasDraft && entry.kind === 'dramas') || entry.definition.enabled === false;

/**
 * 驗證（draft 或者下架嘅 entry 先試完整驗證，唔過再用寬鬆驗證）+ 計 warning；唔合格 → 422 response。
 * 回傳嘅 draft = 存入去之後仲係唔係 draft（完整驗證過咗就自動清）。
 * 下架（enabled: false）都可以寬鬆：admin 新建節目 / 劇未上載圖（或者淨係上載咗一張）都要存到；
 * 圖未齊嘅變 draft，publish 唔包；上架就一定要完整驗證（圖要齊）
 */
export const checkedEntry = async (c: Context<AppEnv>, entry: EntryInput, wasDraft = false) => {
    const context = { origin: c.env.WORKER_ORIGIN, assets: await listAssetHashes(c.env.DB) };
    let ids: string[];
    let draft = false;
    try {
        ids = validateEntry(entry, context);
    } catch (error) {
        if (!mayRelax(entry, wasDraft)) return validationFailed(c, error);
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

const arcIdsOf = (definition: Json): Set<string> =>
    new Set(
        (Array.isArray(definition.arcs) ? (definition.arcs as unknown[]) : []).flatMap((arc) =>
            isRecord(arc) && typeof arc.id === 'string' ? [arc.id] : [],
        ),
    );

/**
 * S-804：舊 definition 有、新 definition 冇嘅短篇 ID 有排程（schedules 行）→ 回第一個（409）。
 * 排程跟 arc_id，改短篇 ID 會令規則同新 ID 斷開；server 唔估「邊個改名做邊個」，要 admin 先刪排程、
 * 改 ID、再排。只睇舊 definition 真係有嘅 ID：以前遺留、對唔返任何短篇嘅排程行唔會令每次儲存都 409。
 * 排程寫入都會 bump entry 嘅 updated_at，所以「檢查 → 寫」之間有人排程，樂觀鎖會 412
 */
const droppedScheduledArc = async (
    db: D1Database,
    existing: StoredEntry,
    definition: Json,
): Promise<string | undefined> => {
    if (existing.kind !== 'dramas') return undefined;
    const next = arcIdsOf(definition);
    const dropped = [...arcIdsOf(JSON.parse(existing.definition) as Json)].filter(
        (id) => !next.has(id),
    );
    if (dropped.length === 0) return undefined;
    const scheduled = await listScheduledArcIds(db, existing.id);
    return dropped.find((id) => scheduled.has(id));
};

const arcScheduled = (c: Context<AppEnv>, arcId: string) =>
    c.json(
        {
            error: `arc ${arcId} has a schedule; delete it before changing the arc id`,
            arcId,
            reason: 'arcScheduled',
        },
        HTTP_STATUS.conflict,
    );

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
        : insertEntryStatement(c.env.DB, row, updatedAt, draft);
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
    const scheduledArc =
        mode === 'update' && existing
            ? await droppedScheduledArc(c.env.DB, existing, entry.definition)
            : undefined;
    if (scheduledArc !== undefined) return arcScheduled(c, scheduledArc);
    // 新增：上架嘅完整驗證；下架嘅圖未齊照存做 draft（admin 新建節目 / 劇）
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
