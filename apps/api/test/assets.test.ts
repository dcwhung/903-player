import { env } from 'cloudflare:test';
import { sha256Hex } from '../src/lib/crypto';
import { adminRequest, call, ORIGIN } from './helpers';
import { webpVp8, webpVp8x } from './webp';

const HASH_HEX = 16;
const MB = 1024 * 1024;

const upload = (body: Uint8Array, contentType = 'image/webp') =>
    adminRequest('PUT', '/api/assets', { body, headers: { 'content-type': contentType } });

/** header 之後補 0 到指定大小（RIFF size 跟住改，parser 照讀到闊高） */
const padded = (bytes: Uint8Array, size: number): Uint8Array => {
    const out = new Uint8Array(size);
    out.set(bytes);
    new DataView(out.buffer).setUint32(4, size - 8, true);
    return out;
};

const nameOf = async (bytes: Uint8Array) => `${(await sha256Hex(bytes)).slice(0, HASH_HEX)}.webp`;

const assetRows = async () =>
    (await env.DB.prepare('SELECT hash, content_type, bytes FROM assets').all()).results;

describe('PUT /api/assets', () => {
    it('should store a 600×600 disc in R2 and assets, named by its sha256', async () => {
        const bytes = webpVp8x(600, 600);
        const response = await upload(bytes);
        expect(response.status).toBe(201);
        const name = await nameOf(bytes);
        expect(await response.json()).toEqual({
            name,
            width: 600,
            height: 600,
            bytes: bytes.length,
        });
        const object = await env.CATALOG.get(`catalog/v1/img/${name}`);
        expect(object?.httpMetadata?.contentType).toBe('image/webp');
        expect(new Uint8Array(await object!.arrayBuffer())).toEqual(bytes);
        expect(await assetRows()).toEqual([
            { hash: name.slice(0, HASH_HEX), content_type: 'image/webp', bytes: bytes.length },
        ]);
    });

    it('should accept a 1216×684 tile and answer 200 existed for the same bytes again', async () => {
        const bytes = webpVp8(1216, 684);
        expect((await upload(bytes)).status).toBe(201);
        const again = await upload(bytes);
        expect(again.status).toBe(200);
        expect(await again.json()).toEqual({ name: await nameOf(bytes), existed: true });
        expect(await assetRows()).toHaveLength(1);
    });

    it('should accept an image bigger than the 256 KB content body limit', async () => {
        const response = await upload(padded(webpVp8x(1216, 684), 512 * 1024));
        expect(response.status).toBe(201);
    });

    it('should answer 415 for any other content type', async () => {
        expect((await upload(webpVp8x(600, 600), 'image/png')).status).toBe(415);
        expect((await upload(webpVp8x(600, 600), 'application/octet-stream')).status).toBe(415);
        expect(await assetRows()).toHaveLength(0);
    });

    it('should answer 413 above ASSET_MAX_BYTES', async () => {
        const response = await upload(padded(webpVp8x(600, 600), MB + 1));
        expect(response.status).toBe(413);
        expect(await assetRows()).toHaveLength(0);
    });

    it('should answer 422 for a malformed WebP', async () => {
        const response = await upload(new TextEncoder().encode('not a webp at all, honestly'));
        expect(response.status).toBe(422);
        expect(await assetRows()).toHaveLength(0);
    });

    it('should answer 422 listing the allowed sizes for any other dimension', async () => {
        const response = await upload(webpVp8x(1216, 608));
        expect(response.status).toBe(422);
        const body = (await response.json()) as { error: string; allowed: string[] };
        expect(body.allowed).toEqual(['600×600', '1216×684']);
        expect(body.error).toContain('1216×608');
        expect((await env.CATALOG.list()).objects).toHaveLength(0);
    });

    it('should not insert the asset row when the R2 write fails', async () => {
        const { assetRoutes } = await import('../src/assets/routes');
        const failing = {
            ...env,
            CATALOG: {
                put: async () => {
                    throw new Error('R2 down');
                },
            } as unknown as R2Bucket,
        };
        const request = new Request(new URL('/assets', ORIGIN), {
            method: 'PUT',
            headers: { 'content-type': 'image/webp' },
            body: webpVp8x(600, 600),
        });
        const response = await assetRoutes.fetch(request, failing);
        expect(response.status).toBe(500);
        expect(await assetRows()).toHaveLength(0);
    });

    it('should need a session and the same origin', async () => {
        const body = webpVp8x(600, 600);
        const headers = { 'content-type': 'image/webp', origin: ORIGIN };
        expect((await call('/api/assets', { method: 'PUT', headers, body })).status).toBe(401);
        const cross = await adminRequest('PUT', '/api/assets', {
            body,
            headers: { 'content-type': 'image/webp', origin: 'https://evil.example' },
        });
        expect(cross.status).toBe(403);
    });
});
