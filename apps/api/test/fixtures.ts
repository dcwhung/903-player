/* D1 seed：一個節目 + 一套短篇劇（同 library 一樣嘅 definition 格式），圖已入 assets */
import { env } from 'cloudflare:test';

type Json = Record<string, unknown>;

const THEME: Json = {
    bg: '#f7e7b4',
    surface: '#fdf3d3',
    track: '#e8c869',
    accent: '#f2c21b',
    onAccent: '#3a2600',
    title: '#7f5500',
    text: '#3b2a0e',
    muted: '#6b5121',
    shadowDark: '#e0c77e',
    shadowLight: '#fff8e2',
};

export const TILE = '0123456789abcdef.webp';
export const DISC = 'fedcba9876543210.webp';
const IMAGES = { 'tile.webp': TILE, 'disc.webp': DISC };

export const SHOW: Json = {
    name: 'Bad Girl大過佬',
    fileTime: '1009',
    airDays: [1, 2, 3, 4, 5],
    tile: 'tile.webp',
    disc: 'disc.webp',
    theme: THEME,
};

export const drama = (episodes: number): Json => ({
    name: '黃金少年',
    kind: 'series',
    enabled: true,
    tile: 'tile.webp',
    disc: 'disc.webp',
    audio: { host: 'r2', folder: '黃金少年', file: '{no2}.m4a' },
    theme: THEME,
    arcs: [{ id: 'season-1', name: 'Season 1', addedAt: '2026-10-24', episodes }],
});

export const putEntry = (kind: string, id: string, definition: Json, images: Json = IMAGES) =>
    env.DB.prepare(
        `INSERT INTO entries (kind, id, definition, images, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (kind, id) DO UPDATE SET definition = excluded.definition, images = excluded.images`,
    )
        .bind(kind, id, JSON.stringify(definition), JSON.stringify(images), '2026-11-08T00:00:00Z')
        .run();

const putAsset = (file: string) =>
    env.DB.prepare('INSERT INTO assets (hash, content_type, bytes, created_at) VALUES (?, ?, ?, ?)')
        .bind(file.split('.')[0], 'image/webp', 1, '2026-11-08T00:00:00Z')
        .run();

/** 1 個節目 + 1 套劇（episodes 集） */
export const seed = async (episodes = 3) => {
    await putAsset(TILE);
    await putAsset(DISC);
    await putEntry('shows', 'badgirl', SHOW);
    await putEntry('dramas', 'golden', drama(episodes));
};
