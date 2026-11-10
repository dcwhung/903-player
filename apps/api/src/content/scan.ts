/*
 * POST /api/dramas/:id/scan：list R2 AUDIO bucket 嘅 <audio.folder>/ → generateDraft（existing = 現有 definition）。
 * 回 { draft, issues, diff }，唔寫 D1：admin 覆核之後再 PUT /api/entries/dramas/:id
 */
import { generateDraft, hkToday } from '@903-player/catalog';
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';
import { getEntry } from '../catalog/store';
import { jsonDiff } from './diff';
import { errorResponse, isRecord, targetOf, type Json } from './http';
import { listingFromR2 } from './r2Listing';

export const scanRoutes = new Hono<AppEnv>();

/** definition.audio：host 係 r2 先掃得 */
const r2FolderOf = (definition: Json): string | undefined => {
    const audio = definition.audio;
    if (!isRecord(audio) || audio.host !== 'r2' || typeof audio.folder !== 'string')
        return undefined;
    return audio.folder;
};

scanRoutes.post('/dramas/:id/scan', async (c) => {
    const target = targetOf(c);
    const row = target && (await getEntry(c.env.DB, 'dramas', target.id));
    if (!target || !row) return errorResponse(c, HTTP_STATUS.notFound, 'no such drama');
    const definition = JSON.parse(row.definition) as Json;
    const folder = r2FolderOf(definition);
    if (folder === undefined)
        return errorResponse(c, HTTP_STATUS.unprocessable, 'audio.host must be r2 to scan');
    const listing = await listingFromR2(c.env.AUDIO, folder);
    const result = generateDraft(listing, {
        id: target.id,
        existing: definition,
        today: hkToday(),
    });
    const diff = result.json === null ? [] : jsonDiff(definition, result.json);
    return c.json({ draft: result.json, issues: result.issues, diff });
});
