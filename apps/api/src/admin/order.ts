/*
 * PUT /api/order/:kind { ids }：拖曳排序（放手即存）。ids = 上架嗰段嘅全部 entry（新次序），
 * 一個 batch 寫晒 definition.order（1、2、3…）；下架 / draft 嘅唔郁（固定排最底）。
 * 用 json_set 原地改 order：唔會冚咗同時進行嘅其他編輯；次序冇變嘅 entry 連 updated_at 都唔郁
 */
import type { CatalogKind } from '@903-player/catalog';
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';
import { listStoredEntries, type StoredEntry } from '../catalog/store';
import { nextUpdatedAt } from '../content/etag';
import { errorResponse, readJsonObject, type Json } from '../content/http';

export const orderRoutes = new Hono<AppEnv>();

const KINDS: readonly string[] = ['shows', 'dramas'] satisfies readonly CatalogKind[];
/** 第一個 order（主頁次序細嘅排先） */
const FIRST_ORDER = 1;

/** 上架嗰段：節目 enabled 冇寫 = 上架；劇集要 enabled: true 兼唔係 draft */
export const isListedEntry = (entry: StoredEntry): boolean => {
    const definition = JSON.parse(entry.definition) as Json;
    if (entry.kind === 'shows') return definition.enabled !== false;
    return entry.draft === 0 && definition.enabled === true;
};

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
    a.length === b.length && new Set(a).size === a.length && b.every((id) => a.includes(id));

const orderStatement = (db: D1Database, entry: StoredEntry, order: number) =>
    db
        .prepare(
            `UPDATE entries SET definition = json_set(definition, '$.order', ?), updated_at = ?
             WHERE kind = ? AND id = ? AND json_extract(definition, '$.order') IS NOT ?`,
        )
        .bind(order, nextUpdatedAt(entry.updated_at), entry.kind, entry.id, order);

const readIds = async (c: Context<AppEnv>): Promise<string[] | undefined> => {
    const ids = (await readJsonObject(c))?.ids;
    return Array.isArray(ids) && ids.every((id): id is string => typeof id === 'string')
        ? ids
        : undefined;
};

/** 一個 batch 寫晒；回次序真係變咗嘅 id */
const writeOrder = async (
    db: D1Database,
    ids: readonly string[],
    listed: readonly StoredEntry[],
) => {
    const byId = new Map(listed.map((e) => [e.id, e]));
    const statements = ids.map((id, i) =>
        orderStatement(db, byId.get(id) as StoredEntry, FIRST_ORDER + i),
    );
    const results = await db.batch(statements);
    return ids.filter((_, i) => (results[i]?.meta.changes ?? 0) > 0);
};

orderRoutes.put('/order/:kind', async (c) => {
    const kind = c.req.param('kind');
    if (!KINDS.includes(kind))
        return errorResponse(c, HTTP_STATUS.badRequest, 'kind must be shows / dramas');
    const ids = await readIds(c);
    if (!ids) return errorResponse(c, HTTP_STATUS.badRequest, 'body must be { ids: string[] }');
    const entries = await listStoredEntries(c.env.DB);
    const listed = entries.filter((e) => e.kind === kind && isListedEntry(e));
    const listedIds = listed.map((e) => e.id);
    if (!sameSet(ids, listedIds))
        return errorResponse(
            c,
            HTTP_STATUS.unprocessable,
            'ids must be exactly the listed entries',
            {
                listed: listedIds,
            },
        );
    return c.json({ ids, changed: await writeOrder(c.env.DB, ids, listed) });
});
