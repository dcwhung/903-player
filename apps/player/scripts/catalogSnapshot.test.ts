// @vitest-environment node
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as catalog from '@903-player/catalog';
import type { Plugin } from 'vite';
import { catalogSnapshot, createSnapshot } from './catalogSnapshot';

const CATALOG_URL = 'https://api.example/catalog/v1/catalog.json';
const IMG_BASE = 'https://api.example/catalog/v1/img/';
const EPISODE_OPTIONS = { appAudioBase: '/903-player/dramas/' };

const THEME = {
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

const hashName = (bytes: Uint8Array, ext = 'webp') =>
    `${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}.${ext}`;

const TILE_BYTES = new Uint8Array([1, 2, 3]);
const DISC_BYTES = new Uint8Array([4, 5, 6]);
const TILE = hashName(TILE_BYTES);
const DISC = hashName(DISC_BYTES);

const document = (images: Record<string, string>) => ({
    schemaVersion: 1,
    generatedAt: '2026-11-10T08:00:00.000Z',
    shows: [
        {
            id: 'badgirl',
            definition: {
                name: 'Bad Girl大過佬',
                fileTime: '1009',
                airDays: [1, 2, 3, 4, 5],
                tile: 'tile.webp',
                disc: 'disc.webp',
                theme: THEME,
            },
            images,
        },
    ],
    dramas: [
        {
            id: 'golden',
            definition: {
                name: '黃金少年',
                kind: 'series',
                enabled: true,
                tile: 'tile.webp',
                disc: 'disc.webp',
                audio: { host: 'r2', folder: '黃金少年', file: '{no2}.m4a' },
                theme: THEME,
                arcs: [{ id: 'season-1', name: 'Season 1', addedAt: '2026-10-24', episodes: 3 }],
            },
            images,
        },
    ],
});

/** 一個 same-origin 路徑、一個絕對 URL（兩種 catalog 圖 URL 都要識） */
const PUBLISHED = document({
    'tile.webp': `${IMG_BASE}${TILE}`,
    'disc.webp': `/catalog/v1/img/${DISC}`,
});

type Routes = Record<string, () => Response | Promise<Response>>;

const fakeFetch = (routes: Routes) =>
    vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        const route = routes[url];
        return route ? route() : new Response('not found', { status: 404 });
    });

const okRoutes = (json: unknown = PUBLISHED): Routes => ({
    [CATALOG_URL]: () => new Response(JSON.stringify(json)),
    [`${IMG_BASE}${TILE}`]: () => new Response(TILE_BYTES),
    [`${IMG_BASE}${DISC}`]: () => new Response(DISC_BYTES),
});

let root: string;
let dir: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'snapshot-'));
    dir = join(root, 'data');
});

afterEach(() => rm(root, { recursive: true, force: true }));

const snapshot = (fetchImpl: typeof fetch, extra = {}) =>
    createSnapshot({
        url: CATALOG_URL,
        dir,
        episodeOptions: EPISODE_OPTIONS,
        catalog,
        fetchImpl,
        ...extra,
    });

/** dir 旁邊唔可以留低暫存 folder */
const leftovers = async () => (await readdir(root)).filter((name) => name !== 'data');

describe('createSnapshot', () => {
    it('should write catalog.json with image file names and the verified images', async () => {
        const text = JSON.stringify(PUBLISHED);
        const result = await snapshot(fakeFetch(okRoutes()));
        expect(result).toEqual({
            hash: createHash('sha256').update(text).digest('hex'),
            generatedAt: PUBLISHED.generatedAt,
            imageCount: 2,
        });
        const written = JSON.parse(await readFile(join(dir, 'catalog.json'), 'utf8'));
        expect(written.shows[0].images).toEqual({ 'tile.webp': TILE, 'disc.webp': DISC });
        expect(written.dramas[0].definition).toEqual(PUBLISHED.dramas[0]?.definition);
        expect(new Uint8Array(await readFile(join(dir, 'img', TILE)))).toEqual(TILE_BYTES);
        expect((await readdir(join(dir, 'img'))).sort()).toEqual([TILE, DISC].sort());
        expect(await leftovers()).toEqual([]);
    });

    it('should download each image once, at most `concurrency` at a time', async () => {
        let inFlight = 0;
        let peak = 0;
        const routes = okRoutes();
        const slow = (route: () => Response | Promise<Response>) => async () => {
            peak = Math.max(peak, ++inFlight);
            await new Promise((resolve) => setTimeout(resolve, 5));
            inFlight -= 1;
            return route();
        };
        const fetchImpl = fakeFetch({
            ...routes,
            [`${IMG_BASE}${TILE}`]: slow(routes[`${IMG_BASE}${TILE}`]!),
            [`${IMG_BASE}${DISC}`]: slow(routes[`${IMG_BASE}${DISC}`]!),
        });
        await snapshot(fetchImpl, { concurrency: 1 });
        expect(peak).toBe(1);
        expect(fetchImpl).toHaveBeenCalledTimes(3);
    });

    it('should reject a catalog the player validators refuse, writing nothing', async () => {
        const broken = document({ 'tile.webp': `${IMG_BASE}${TILE}` });
        const fetchImpl = fakeFetch(okRoutes(broken));
        await expect(snapshot(fetchImpl)).rejects.toThrow(/disc/);
        expect(existsSync(dir)).toBe(false);
        expect(await leftovers()).toEqual([]);
    });

    it('should reject an image whose sha256 does not match its file name', async () => {
        const fetchImpl = fakeFetch({
            ...okRoutes(),
            [`${IMG_BASE}${DISC}`]: () => new Response(new Uint8Array([9])),
        });
        await expect(snapshot(fetchImpl)).rejects.toThrow(/hash/);
        expect(existsSync(dir)).toBe(false);
        expect(await leftovers()).toEqual([]);
    });

    it('should reject an image URL that is not <hash>.<ext>', async () => {
        const odd = document({
            'tile.webp': `${IMG_BASE}tile.webp`,
            'disc.webp': `${IMG_BASE}${DISC}`,
        });
        await expect(snapshot(fakeFetch(okRoutes(odd)))).rejects.toThrow(/tile\.webp/);
    });

    it('should reject an HTTP error and a fetch that never answers', async () => {
        await expect(snapshot(fakeFetch({}))).rejects.toThrow(/404/);
        const hanging = vi.fn(() => new Promise<Response>(() => undefined));
        await expect(snapshot(hanging, { timeoutMs: 10 })).rejects.toThrow(/timed out/);
        expect(existsSync(dir)).toBe(false);
    });
});

/** Plugin hook 可以係 function 或者 { handler } */
const hook = (plugin: Plugin, name: 'configResolved' | 'buildStart') => {
    const value = plugin[name] as unknown;
    const fn = (typeof value === 'function' ? value : (value as { handler: unknown }).handler) as (
        ...args: unknown[]
    ) => unknown;
    return (...args: unknown[]) => fn.apply({}, args);
};

const runPlugin = async (
    { command = 'build', mode = 'production', url = CATALOG_URL } = {},
    fetchImpl: typeof fetch = fakeFetch(okRoutes()),
) => {
    const plugin = catalogSnapshot({
        url,
        dir,
        episodeOptions: EPISODE_OPTIONS,
        loadCatalog: async () => catalog,
        fetchImpl,
    });
    await hook(plugin, 'configResolved')({ command, mode });
    await hook(plugin, 'buildStart')({});
};

describe('catalogSnapshot plugin', () => {
    const staleSnapshot = async () => {
        await mkdir(join(dir, 'img'), { recursive: true });
        await writeFile(join(dir, 'catalog.json'), '{}');
    };

    it('should replace an old snapshot and log its hash, generatedAt and image count', async () => {
        await staleSnapshot();
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        await runPlugin();
        expect(JSON.parse(await readFile(join(dir, 'catalog.json'), 'utf8')).generatedAt).toBe(
            PUBLISHED.generatedAt,
        );
        expect(String(log.mock.calls[0]?.[0])).toMatch(
            /hash [0-9a-f]{64}.*2026-11-10T08.*2 images/,
        );
        log.mockRestore();
    });

    it('should warn, remove the old snapshot and let the build go on when the fetch fails', async () => {
        await staleSnapshot();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        await expect(runPlugin({}, fakeFetch({}))).resolves.toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0]?.[0])).toContain('repo library');
        expect(existsSync(dir)).toBe(false);
        warn.mockRestore();
    });

    it('should not fetch for an e2e build, a build without a catalog URL, or the dev server', async () => {
        const fetchImpl = fakeFetch(okRoutes());
        await runPlugin({ mode: 'e2e' }, fetchImpl);
        await runPlugin({ url: '' }, fetchImpl);
        await staleSnapshot();
        await runPlugin({ command: 'serve' }, fetchImpl);
        expect(fetchImpl).not.toHaveBeenCalled();
        // dev server 唔郁 snapshot（只有 build 先清舊嘢）
        expect(existsSync(join(dir, 'catalog.json'))).toBe(true);
        await runPlugin({ url: '' }, fetchImpl);
        expect(existsSync(dir)).toBe(false);
    });
});
