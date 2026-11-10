/*
 * /api/dramas/:id/arcs/:arcId/schedule：短篇排程（儲存時展開）。
 * PUT：規則 → expandSchedule → 寫入 definition 嗰個 arc（addedAt / episodeDates / episodeRemovedAt）→ 驗證 →
 * D1 batch 一次過寫 entries + schedules（atomic，樂觀鎖失敗兩樣都唔寫）。DELETE 只刪規則，日子照留
 */
import {
    expandSchedule,
    parseScheduleRule,
    ScheduleError,
    type ExpandedSchedule,
    type ScheduleRule,
} from '@903-player/catalog';
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';
import {
    deleteSchedule,
    getEntry,
    getSchedule,
    updateEntryStatement,
    upsertScheduleStatement,
    type StoredEntry,
} from '../catalog/store';
import { checkedEntry, rowOf } from './entries';
import { etagOf, ifMatches, nextUpdatedAt } from './etag';
import {
    badTarget,
    errorResponse,
    isRecord,
    preconditionFailed,
    readJsonObject,
    targetOf,
    type Json,
} from './http';

export const scheduleRoutes = new Hono<AppEnv>();

const SCHEDULE_PATH = '/dramas/:id/arcs/:arcId/schedule';
const FIRST_NO_DEFAULT = 1;

interface LoadedArc {
    id: string;
    arcId: string;
    row: StoredEntry;
    definition: Json;
    arcs: Json[];
    index: number;
}

const notFound = (c: Context<AppEnv>, what: string) =>
    errorResponse(c, HTTP_STATUS.notFound, `no such ${what}`);

/** 讀劇集 + 搵 arc；唔得就回 404 / 422 response */
const loadArc = async (c: Context<AppEnv>): Promise<LoadedArc | Response> => {
    const target = targetOf(c);
    // id 唔合規 400、合規但冇呢套劇 404（同 /entries 一致，S-787）
    if (!target) return badTarget(c);
    const row = await getEntry(c.env.DB, 'dramas', target.id);
    if (!row) return notFound(c, 'drama');
    const definition = JSON.parse(row.definition) as Json;
    if (definition.kind !== 'series')
        return errorResponse(c, HTTP_STATUS.unprocessable, 'schedules only apply to series arcs');
    const arcs = (Array.isArray(definition.arcs) ? definition.arcs : []) as Json[];
    const arcId = c.req.param('arcId') ?? '';
    const index = arcs.findIndex((arc) => isRecord(arc) && arc.id === arcId);
    if (index === -1) return notFound(c, 'arc');
    return { id: target.id, arcId, row, definition, arcs, index };
};

const arcShape = (arc: Json) => ({
    firstNo: typeof arc.firstNo === 'number' ? arc.firstNo : FIRST_NO_DEFAULT,
    count: Array.isArray(arc.episodes)
        ? arc.episodes.length
        : typeof arc.episodes === 'number'
          ? arc.episodes
          : undefined,
});

const expand = (value: unknown, loaded: LoadedArc) => {
    const rule = parseScheduleRule(value);
    return { rule, expanded: expandSchedule(rule, arcShape(loaded.arcs[loaded.index] ?? {})) };
};

/** 展開結果寫入 arc：冇嘅欄位（例如一次過上晒）就刪走舊值 */
const applyToArc = (arc: Json, expanded: ExpandedSchedule): Json => {
    const next: Json = { ...arc, addedAt: expanded.addedAt };
    const fields = {
        episodeDates: expanded.episodeDates,
        episodeRemovedAt: expanded.episodeRemovedAt,
    };
    Object.entries(fields).forEach(([key, value]) => {
        if (Object.keys(value).length > 0) next[key] = value;
        else delete next[key];
    });
    return next;
};

const scheduledDefinition = (loaded: LoadedArc, expanded: ExpandedSchedule): Json => ({
    ...loaded.definition,
    arcs: loaded.arcs.map((arc, i) => (i === loaded.index ? applyToArc(arc, expanded) : arc)),
});

/** body { rule } → 展開 + 驗證成個 definition；唔得就回 400 / 422 response */
const prepare = async (c: Context<AppEnv>, loaded: LoadedArc) => {
    const body = await readJsonObject(c);
    if (!body) return errorResponse(c, HTTP_STATUS.badRequest, 'body must be { rule }');
    let result: { rule: ScheduleRule; expanded: ExpandedSchedule };
    try {
        result = expand(body.rule, loaded);
    } catch (error) {
        if (!(error instanceof ScheduleError)) throw error;
        return errorResponse(c, HTTP_STATUS.unprocessable, 'invalid schedule', {
            details: error.message,
        });
    }
    const definition = scheduledDefinition(loaded, result.expanded);
    const images = JSON.parse(loaded.row.images) as Json;
    const entry = { kind: 'dramas' as const, id: loaded.id, definition, images };
    const checked = await checkedEntry(c, entry, loaded.row.draft === 1);
    if (checked instanceof Response) return checked;
    return { ...result, definition, images, ...checked };
};

scheduleRoutes.get(SCHEDULE_PATH, async (c) => {
    const loaded = await loadArc(c);
    if (loaded instanceof Response) return loaded;
    const stored = await getSchedule(c.env.DB, loaded.id, loaded.arcId);
    if (!stored) return notFound(c, 'schedule');
    try {
        const { rule, expanded } = expand(JSON.parse(stored.rule), loaded);
        return c.json({ rule, expanded, updatedAt: stored.updated_at });
    } catch (error) {
        if (!(error instanceof ScheduleError)) throw error;
        // arc 改咗（例如集數未知）展開唔到：照回規則，等 admin 改
        const rule = JSON.parse(stored.rule) as unknown;
        return c.json({ rule, expanded: null, error: error.message, updatedAt: stored.updated_at });
    }
});

scheduleRoutes.post(`${SCHEDULE_PATH}/preview`, async (c) => {
    const loaded = await loadArc(c);
    if (loaded instanceof Response) return loaded;
    const prepared = await prepare(c, loaded);
    if (prepared instanceof Response) return prepared;
    return c.json({ expanded: prepared.expanded, warnings: prepared.warnings });
});

scheduleRoutes.put(SCHEDULE_PATH, async (c) => {
    const loaded = await loadArc(c);
    if (loaded instanceof Response) return loaded;
    if (!ifMatches(c.req.header('if-match'), loaded.row.updated_at)) return preconditionFailed(c);
    const prepared = await prepare(c, loaded);
    if (prepared instanceof Response) return prepared;
    const { rule, expanded, definition, images, warnings, draft } = prepared;
    const updatedAt = nextUpdatedAt(loaded.row.updated_at);
    const row = rowOf({ kind: 'dramas', id: loaded.id, definition, images });
    const [entry] = await c.env.DB.batch([
        updateEntryStatement(c.env.DB, row, {
            expected: loaded.row.updated_at,
            updatedAt,
            draft,
        }),
        upsertScheduleStatement(c.env.DB, {
            dramaId: loaded.id,
            arcId: loaded.arcId,
            rule: JSON.stringify(rule),
            updatedAt,
        }),
    ]);
    if ((entry?.meta.changes ?? 0) === 0) return preconditionFailed(c);
    return c.json({ rule, expanded, updatedAt, warnings }, HTTP_STATUS.ok, {
        etag: etagOf(updatedAt),
    });
});

scheduleRoutes.delete(SCHEDULE_PATH, async (c) => {
    const target = targetOf(c);
    if (!target) return badTarget(c);
    const arcId = c.req.param('arcId') ?? '';
    const deleted = await deleteSchedule(c.env.DB, target.id, arcId);
    return deleted ? c.body(null, HTTP_STATUS.noContent) : notFound(c, 'schedule');
});
