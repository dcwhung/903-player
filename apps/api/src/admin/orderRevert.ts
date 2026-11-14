/*
 * POST /api/order/:kind/revert（0.12.0，#6 決定 A）：排序成個列表還原返最新 ok publish 嘅次序。
 * D1 每個呢個 kind 嘅 entry：published 有 order → 寫返嗰個值；published 冇 order → 刪 key；
 * published 冇呢個 entry（新加）→ 唔郁。同 PUT /api/order 一樣用 json_set / json_remove 原地改，
 * 唔郁其他欄位；值冇變嘅 entry 連 updated_at 都唔郁（S-799 規則）。
 * 冇 ok publish → 409 { reason: 'notPublished' }；回應 200 { updated: 真係改咗嘅 entry 數 }
 */
import type { CatalogEntry, CatalogKind } from '@903-player/catalog';
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';
import { latestPublish, listStoredEntries, type StoredEntry } from '../catalog/store';
import { nextUpdatedAt } from '../content/etag';
import { errorResponse } from '../content/http';
import { publishedDocument } from './changeDocuments';
import { bumpedUpdatedAt, ORDER_KINDS, orderStatement } from './order';

export const orderRevertRoutes = new Hono<AppEnv>();

const removeOrderStatement = (db: D1Database, entry: StoredEntry) =>
    db
        .prepare(
            `UPDATE entries
             SET definition = json_remove(definition, '$.order'),
                 updated_at = ${bumpedUpdatedAt('?1')}
             WHERE kind = ?2 AND id = ?3 AND json_type(definition, '$.order') IS NOT NULL`,
        )
        .bind(nextUpdatedAt(entry.updated_at), entry.kind, entry.id);

/** published 嘅 entry → 還原 statement；published 冇佢 → 冇 */
const revertStatement = (
    db: D1Database,
    entry: StoredEntry,
    published: ReadonlyMap<string, CatalogEntry>,
): D1PreparedStatement | undefined => {
    const source = published.get(entry.id);
    if (!source) return undefined;
    const { order } = source.definition;
    return typeof order === 'number'
        ? orderStatement(db, entry, order)
        : removeOrderStatement(db, entry);
};

orderRevertRoutes.post('/order/:kind/revert', async (c) => {
    const kind = c.req.param('kind');
    if (!ORDER_KINDS.includes(kind))
        return errorResponse(c, HTTP_STATUS.badRequest, 'kind must be shows / dramas');
    const [latest, entries] = await Promise.all([
        latestPublish(c.env.DB),
        listStoredEntries(c.env.DB),
    ]);
    if (!latest)
        return errorResponse(c, HTTP_STATUS.conflict, 'nothing has been published', {
            reason: 'notPublished',
        });
    const list = publishedDocument(latest.document)[kind as CatalogKind];
    const published = new Map(list.map((entry) => [entry.id, entry]));
    const statements = entries
        .filter((entry) => entry.kind === kind)
        .flatMap((entry) => revertStatement(c.env.DB, entry, published) ?? []);
    const results = statements.length > 0 ? await c.env.DB.batch(statements) : [];
    const updated = results.filter((result) => (result.meta.changes ?? 0) > 0).length;
    return c.json({ updated });
});
