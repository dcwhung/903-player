/*
 * POST /api/entries/:kind/:id/revert（0.11.0）：未發佈改動逐項還原返最新 ok publish 嘅版本（revert.ts）。
 * 次序：target 400 → body 400 → 冇 entry 404 → If-Match（必須）412 → 冇 published 版本 409 →
 * 還原（400 / 409）→ 同 PUT 同一條寫入路徑（writeEntry：排程 ID 守衛 409、驗證 422、樂觀鎖 412）。
 * 回應同 PUT 一樣：{ updatedAt, draft, warnings } + ETag。
 * 排程規則（schedules 表）唔郁：還原 addedAt / episodeDates / episodeRemovedAt 淨係改 definition，
 * 規則照留（下次儲存排程先再展開）；removedAt 唔經排程
 */
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';
import { getEntry } from '../catalog/store';
import { writeEntry } from './entries';
import { ifMatches } from './etag';
import {
    badTarget,
    errorResponse,
    isRecord,
    preconditionFailed,
    readJsonObject,
    targetOf,
    type Json,
} from './http';
import { loadPublishedEntry } from './published';
import { applyRevert, RevertError, type RevertItem } from './revert';

export const revertRoutes = new Hono<AppEnv>();

const ITEM_KEYS: ReadonlySet<string> = new Set(['arc', 'field']);
const BAD_BODY = 'body must be { items: [{ arc?: string, field: string }] } with at least one item';

const itemOf = (raw: unknown): RevertItem | undefined => {
    if (!isRecord(raw) || Object.keys(raw).some((key) => !ITEM_KEYS.has(key))) return undefined;
    const { arc, field } = raw;
    if (typeof field !== 'string' || field === '') return undefined;
    if (arc === undefined) return { field };
    return typeof arc === 'string' && arc !== '' ? { arc, field } : undefined;
};

/** { items: [{ arc?, field }] }（最少一項）；唔啱 → undefined */
export const revertItemsOf = (body: Json | undefined): RevertItem[] | undefined => {
    const items = body?.items;
    if (!Array.isArray(items) || items.length === 0) return undefined;
    const parsed = (items as unknown[]).map(itemOf);
    return parsed.every((item) => item !== undefined) ? parsed : undefined;
};

revertRoutes.post('/entries/:kind/:id/revert', async (c) => {
    const target = targetOf(c);
    if (!target) return badTarget(c);
    const items = revertItemsOf(await readJsonObject(c));
    if (!items) return errorResponse(c, HTTP_STATUS.badRequest, BAD_BODY);
    const existing = await getEntry(c.env.DB, target.kind, target.id);
    if (!existing) return errorResponse(c, HTTP_STATUS.notFound, 'no such entry');
    if (!ifMatches(c.req.header('if-match'), existing.updated_at)) return preconditionFailed(c);
    const published = await loadPublishedEntry(c.env.DB, target.kind, target.id);
    if (!published)
        return errorResponse(c, HTTP_STATUS.conflict, 'entry has no published version', {
            reason: 'notPublished',
        });
    const current = {
        definition: JSON.parse(existing.definition) as Json,
        images: JSON.parse(existing.images) as Json,
    };
    try {
        const reverted = applyRevert(current, published, items);
        return await writeEntry(c, { ...target, ...reverted }, existing);
    } catch (error) {
        if (!(error instanceof RevertError)) throw error;
        return errorResponse(c, error.status, error.message);
    }
});
