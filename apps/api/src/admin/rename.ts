/*
 * POST /api/entries/dramas/:id/rename { newId }：改劇集 ID（掃描派嘅 drama-NN → 有意思嘅 ID）。
 * 只限從未發佈（ID 係 episode ID 嘅一部份，發佈咗改就冇晒用戶進度）→ 否則 409；
 * entries PK + schedules.drama_id + scan_findings 一個 batch 改。
 * 掃描跟劇 ID 自動編號嘅短篇 ID（<舊 ID>-NN，Phase 3c）一齊改做 <新 ID>-NN（definition、schedules、findings）
 */
import { ID_PATTERN } from '@903-player/catalog';
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';
import { getEntry } from '../catalog/store';
import { etagOf, expectedVersion, nextUpdatedAt } from '../content/etag';
import {
    badTarget,
    errorResponse,
    isRecord,
    type Json,
    preconditionFailed,
    readJsonObject,
    targetOf,
} from '../content/http';
import { renameFindingsStatement } from './findings';

export const renameRoutes = new Hono<AppEnv>();

/**
 * 任何一次 ok publish 鎖住咗呢套劇嘅 episode ID（即係上過架，W-707）；
 * 淨係下架狀態發佈過（例如掃描出嚟嘅 drama-01）唔算
 */
export const wasEverPublished = async (db: D1Database, id: string): Promise<boolean> => {
    // ID 只有細楷英數同 -，LIKE 唔會撞 % / _ 通配
    const row = await db
        .prepare(
            `SELECT 1 AS found FROM publishes WHERE status = 'ok'
             AND episode_ids LIKE ? LIMIT 1`,
        )
        .bind(`%"drama:${id}:%`)
        .first();
    return row !== null;
};

/** 自動編號短篇 ID：<劇 ID>-NN（兩位數） */
const AUTO_ARC_SUFFIX = /^-\d{2}$/;

/** <from>-NN → <to>-NN；其他 ID 唔郁 */
export const renamedArcId = (arcId: string, from: string, to: string): string =>
    arcId.startsWith(from) && AUTO_ARC_SUFFIX.test(arcId.slice(from.length))
        ? `${to}${arcId.slice(from.length)}`
        : arcId;

export const withRenamedArcIds = (definition: Json, from: string, to: string): Json =>
    Array.isArray(definition.arcs)
        ? {
              ...definition,
              arcs: (definition.arcs as unknown[]).map((arc) =>
                  isRecord(arc) && typeof arc.id === 'string'
                      ? { ...arc, id: renamedArcId(arc.id, from, to) }
                      : arc,
              ),
          }
        : definition;

/** SQL：arc_id 係 <from>-NN 就換頭（ID 只有細楷英數同 -，GLOB 唔會撞通配） */
const ARC_ID_SQL = `CASE WHEN arc_id GLOB ? THEN ? || substr(arc_id, ?) ELSE arc_id END`;
const arcIdBinds = (from: string, to: string) => [`${from}-[0-9][0-9]`, to, from.length + 1];

/** findings 嘅 arc_id（自動編號）跟住改；要喺 drama_id 改之前 */
const renameFindingArcsStatement = (
    db: D1Database,
    { from, to, updatedAt }: { from: string; to: string; updatedAt: string },
) =>
    db
        .prepare(
            `UPDATE scan_findings SET arc_id = ${ARC_ID_SQL} WHERE drama_id = ? AND arc_id IS NOT NULL
             AND EXISTS (SELECT 1 FROM entries WHERE kind = 'dramas' AND id = ? AND updated_at = ?)`,
        )
        .bind(...arcIdBinds(from, to), from, to, updatedAt);

const renameStatements = (
    db: D1Database,
    {
        from,
        to,
        expected,
        updatedAt,
        definition,
    }: { from: string; to: string; expected: string; updatedAt: string; definition: string },
) => [
    db
        .prepare(
            `UPDATE entries SET id = ?, definition = ?, updated_at = ?
             WHERE kind = 'dramas' AND id = ? AND updated_at = ?`,
        )
        .bind(to, definition, updatedAt, from, expected),
    // 上一句真係改咗先跟住改（樂觀鎖輸咗就乜都唔郁）
    db
        .prepare(
            `UPDATE schedules SET drama_id = ?, arc_id = ${ARC_ID_SQL} WHERE drama_id = ? AND EXISTS
             (SELECT 1 FROM entries WHERE kind = 'dramas' AND id = ? AND updated_at = ?)`,
        )
        .bind(to, ...arcIdBinds(from, to), from, to, updatedAt),
    renameFindingArcsStatement(db, { from, to, updatedAt }),
    renameFindingsStatement(db, from, to, updatedAt),
];

/** 改得先回現有 entry：404 / 412 / 409（發佈過、新 ID 已經有） */
const renamable = async (c: Context<AppEnv>, id: string, newId: string) => {
    const existing = await getEntry(c.env.DB, 'dramas', id);
    if (!existing) return errorResponse(c, HTTP_STATUS.notFound, 'no such entry');
    const expected = expectedVersion(c.req.header('if-match'));
    if (expected !== null && expected !== existing.updated_at) return preconditionFailed(c);
    if (await wasEverPublished(c.env.DB, id))
        return errorResponse(c, HTTP_STATUS.conflict, 'published dramas cannot change their id');
    if (newId !== id && (await getEntry(c.env.DB, 'dramas', newId)))
        return errorResponse(c, HTTP_STATUS.conflict, `drama ${newId} already exists`);
    return existing;
};

renameRoutes.post('/entries/dramas/:id/rename', async (c) => {
    const target = targetOf(c);
    if (!target) return badTarget(c);
    const body = await readJsonObject(c);
    const newId = body?.newId;
    if (typeof newId !== 'string' || !ID_PATTERN.test(newId))
        return errorResponse(
            c,
            HTTP_STATUS.badRequest,
            'body must be { newId } matching the folder rule',
        );
    const existing = await renamable(c, target.id, newId);
    if (existing instanceof Response) return existing;
    const updatedAt = nextUpdatedAt(existing.updated_at);
    const [renamed] = await c.env.DB.batch(
        renameStatements(c.env.DB, {
            from: target.id,
            to: newId,
            expected: existing.updated_at,
            updatedAt,
            definition: JSON.stringify(
                withRenamedArcIds(JSON.parse(existing.definition) as Json, target.id, newId),
            ),
        }),
    );
    if ((renamed?.meta.changes ?? 0) === 0) return preconditionFailed(c);
    return c.json({ id: newId, updatedAt }, HTTP_STATUS.ok, { etag: etagOf(updatedAt) });
});
