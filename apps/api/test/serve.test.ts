import { env } from 'cloudflare:test';
import { adminPost, call } from './helpers';
import { TILE, seed } from './fixtures';

const PLAYER = 'https://903-player.vercel.app';
const PAGES = 'https://dcwhung.github.io';
const IMAGE_BYTES = new Uint8Array([82, 73, 70, 70]);

const get = (path: string, headers: Record<string, string> = {}) => call(path, { headers });

describe('GET /catalog/v1/catalog.json', () => {
    beforeEach(async () => {
        await seed(3);
        await adminPost('/api/publish');
    });

    it('should serve the published JSON with a 60s public cache and an ETag', async () => {
        const response = await get('/catalog/v1/catalog.json');
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toMatch(/application\/json/);
        expect(response.headers.get('cache-control')).toBe('public, max-age=60');
        expect(response.headers.get('etag')).toMatch(/^"[0-9a-f]{64}"$/);
        expect(((await response.json()) as { schemaVersion: number }).schemaVersion).toBe(1);
    });

    it('should answer 304 when the ETag still matches', async () => {
        const etag = (await get('/catalog/v1/catalog.json')).headers.get('etag') ?? '';
        const response = await get('/catalog/v1/catalog.json', { 'if-none-match': etag });
        expect(response.status).toBe(304);
        expect(response.headers.get('etag')).toBe(etag);
    });

    it('should allow CORS only for player origins and always vary on Origin', async () => {
        for (const origin of [PLAYER, PAGES]) {
            const response = await get('/catalog/v1/catalog.json', { origin });
            expect(response.headers.get('access-control-allow-origin')).toBe(origin);
            expect(response.headers.get('vary')).toMatch(/Origin/);
        }
        const other = await get('/catalog/v1/catalog.json', { origin: 'https://evil.example' });
        expect(other.headers.get('access-control-allow-origin')).toBeNull();
        expect(other.headers.get('vary')).toMatch(/Origin/);
    });

    it('should not leak one origin to another through the edge cache', async () => {
        await get('/catalog/v1/catalog.json', { origin: PLAYER });
        const response = await get('/catalog/v1/catalog.json', { origin: PAGES });
        expect(response.headers.get('access-control-allow-origin')).toBe(PAGES);
    });

    it('should serve a new publish straight away (edge cache purged)', async () => {
        const before = (await get('/catalog/v1/catalog.json')).headers.get('etag');
        await env.DB.prepare(
            "UPDATE entries SET definition = json_set(definition, '$.name', 'X')",
        ).run();
        await adminPost('/api/publish');
        const after = (await get('/catalog/v1/catalog.json')).headers.get('etag');
        expect(after).not.toBe(before);
    });
});

describe('catalog.json before any publish', () => {
    it('should answer 404 that is not cached', async () => {
        const response = await get('/catalog/v1/catalog.json');
        expect(response.status).toBe(404);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });
});

describe('GET /catalog/v1/img/:file', () => {
    beforeEach(() =>
        env.CATALOG.put(`catalog/v1/img/${TILE}`, IMAGE_BYTES, {
            httpMetadata: { contentType: 'image/webp' },
        }),
    );

    it('should serve the image as immutable for a year with CORS', async () => {
        const response = await get(`/catalog/v1/img/${TILE}`, { origin: PLAYER });
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('image/webp');
        expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
        expect(response.headers.get('access-control-allow-origin')).toBe(PLAYER);
        expect(new Uint8Array(await response.arrayBuffer())).toEqual(IMAGE_BYTES);
    });

    it('should answer an uncached 404 for a missing image', async () => {
        const response = await get('/catalog/v1/img/aaaaaaaaaaaaaaaa.webp');
        expect(response.status).toBe(404);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('should 404 a file name that is not a content hash without touching R2', async () => {
        expect((await get('/catalog/v1/img/..%2Fcatalog.json')).status).toBe(404);
        expect((await get('/catalog/v1/img/tile.webp')).status).toBe(404);
    });
});
