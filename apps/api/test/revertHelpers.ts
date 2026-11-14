/* 還原（0.11.0）test 共用：GET / POST revert、讀 D1 嘅 entry */
import { env } from 'cloudflare:test';
import { adminGet, adminRequest } from './helpers';
import { drama } from './fixtures';

export type Json = Record<string, unknown>;

export const NEW_TILE = 'aaaaaaaaaaaaaaaa.webp';
const SEASON_2 = { id: 'season-2', name: 'Season 2', addedAt: '2026-10-25', episodes: 2 };

/** 兩個短篇嘅劇（短篇刪咗再加返要用） */
export const twoArcs = (): Json => {
    const base = drama(3);
    return { ...base, arcs: [...(base.arcs as Json[]), SEASON_2] };
};

export const getJson = async (kind: string, id: string) =>
    (await (await adminGet(`/api/entries/${kind}/${id}`)).json()) as {
        definition: Json;
        images: Json;
        published: { definition: Json; images: Json } | null;
    };

const etagOf = async (kind: string, id: string) =>
    (await adminGet(`/api/entries/${kind}/${id}`)).headers.get('etag') ?? '';

export const revert = async (kind: string, id: string, body: unknown, etag?: string) =>
    adminRequest('POST', `/api/entries/${kind}/${id}/revert`, {
        body,
        headers: { 'if-match': etag ?? (await etagOf(kind, id)) },
    });

export const stored = async (kind: string, id: string) => {
    const row = await env.DB.prepare(
        'SELECT definition, images FROM entries WHERE kind = ? AND id = ?',
    )
        .bind(kind, id)
        .first<{ definition: string; images: string }>();
    return {
        definition: JSON.parse(row?.definition ?? '{}') as Json,
        images: JSON.parse(row?.images ?? '{}') as Json,
    };
};

export const arcsOf = (definition: Json) => definition.arcs as Json[];

export const putNewTileAsset = () =>
    env.DB.prepare('INSERT INTO assets (hash, content_type, bytes, created_at) VALUES (?, ?, ?, ?)')
        .bind(NEW_TILE.split('.')[0], 'image/webp', 1, '2026-11-08T00:00:00Z')
        .run();
