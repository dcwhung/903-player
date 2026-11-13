/*
 * R2 原圖（Phase 4 封面編輯器）：
 * - GET /api/dramas/:id/sources：即場掃 AUDIO，回 cd cover / cover photo 嘅 key
 * - GET /api/r2-source?key=…：只准該劇最新掃描結果嘅 cdCover / coverPhoto，代讀原圖
 */
import { env } from 'cloudflare:test';
import { adminGet, call, loginCookie } from './helpers';
import { drama, markDraft, putEntry, seed } from './fixtures';

const FOLDER = '黃金少年';
const MB = 1024 * 1024;
/** R2_SOURCE_MAX_BYTES（20 MB） */
const SOURCE_MAX_BYTES = 20 * MB;

const DRAMA_PHOTO = `${FOLDER}/Cover Photo.JPG`;
const ARC_DISC = `${FOLDER}/Season 1/cd cover.png`;
const PHOTO_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

const put = (key: string, body: Uint8Array | string, contentType?: string) =>
    env.AUDIO.put(key, body, contentType ? { httpMetadata: { contentType } } : {});

const source = async (key: string, headers: Record<string, string> = {}) =>
    call(`/api/r2-source?key=${encodeURIComponent(key)}`, {
        headers: { cookie: await loginCookie(), ...headers },
    });

beforeEach(async () => {
    await seed(3);
    await put(DRAMA_PHOTO, PHOTO_BYTES);
    await put(ARC_DISC, new Uint8Array([0x89, 0x50, 0x4e, 0x47]), 'image/png');
    await put(`${FOLDER}/Season 1/01.m4a`, new Uint8Array([0]));
    await put(`${FOLDER}/other.jpg`, new Uint8Array([0]));
});

describe('GET /api/dramas/:id/sources', () => {
    it('should list the drama and arc cover keys from a live R2 scan', async () => {
        const response = await adminGet('/api/dramas/golden/sources');
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            folder: FOLDER,
            cdCover: null,
            coverPhoto: DRAMA_PHOTO,
            arcs: [{ name: 'Season 1', id: 'season-1', cdCover: ARC_DISC, coverPhoto: null }],
        });
    });

    it('should give id null for an arc folder that is not in the definition yet', async () => {
        await put(`${FOLDER}/Season 2/Cover Photo.webp`, new Uint8Array([0]));
        const body = (await (await adminGet('/api/dramas/golden/sources')).json()) as {
            arcs: unknown[];
        };
        expect(body.arcs).toContainEqual({
            name: 'Season 2',
            id: null,
            cdCover: null,
            coverPhoto: `${FOLDER}/Season 2/Cover Photo.webp`,
        });
    });

    it('should work for a draft drama too', async () => {
        await markDraft('dramas', 'golden');
        expect((await adminGet('/api/dramas/golden/sources')).status).toBe(200);
    });

    it('should answer 400 / 404 / 422 for a bad id, an unknown drama and a non-r2 drama', async () => {
        expect((await adminGet('/api/dramas/Bad_Id/sources')).status).toBe(400);
        expect((await adminGet('/api/dramas/nope/sources')).status).toBe(404);
        await putEntry('dramas', 'golden', {
            ...drama(3),
            audio: { host: 'app', folder: FOLDER, file: '{no2}.m4a' },
        });
        expect((await adminGet('/api/dramas/golden/sources')).status).toBe(422);
    });

    it('should need a session', async () => {
        expect((await call('/api/dramas/golden/sources')).status).toBe(401);
    });
});

describe('GET /api/r2-source', () => {
    it('should stream a drama cover photo with an image type from its extension', async () => {
        const response = await source(DRAMA_PHOTO);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('image/jpeg');
        expect(response.headers.get('cache-control')).toBe('private, no-cache');
        expect(response.headers.get('x-content-type-options')).toBe('nosniff');
        expect(response.headers.get('etag')).toMatch(/^"/);
        expect(new Uint8Array(await response.arrayBuffer())).toEqual(PHOTO_BYTES);
    });

    it('should stream an arc cd cover', async () => {
        const response = await source(ARC_DISC);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('image/png');
    });

    it('should answer 304 for a repeated call with the same ETag', async () => {
        const first = await source(DRAMA_PHOTO);
        await first.arrayBuffer();
        const etag = first.headers.get('etag') ?? '';
        const again = await source(DRAMA_PHOTO, { 'if-none-match': etag });
        expect(again.status).toBe(304);
        expect(again.headers.get('etag')).toBe(etag);
    });

    it('should answer 400 without a key', async () => {
        const response = await call('/api/r2-source', { headers: { cookie: await loginCookie() } });
        expect(response.status).toBe(400);
    });

    it('should answer 404 for any key that is not a scanned cd cover / cover photo', async () => {
        for (const key of [
            `${FOLDER}/other.jpg`,
            `${FOLDER}/Season 1/01.m4a`,
            `${FOLDER}/../${DRAMA_PHOTO}`,
            `${FOLDER}/Season 1/Cover Photo.JPG`,
            `其他劇/Cover Photo.JPG`,
            DRAMA_PHOTO.toLowerCase(),
            '',
        ].filter(Boolean)) {
            const response = await source(key);
            expect(response.status, key).toBe(404);
        }
    });

    it('should answer 404 once the source image is gone from R2', async () => {
        await env.AUDIO.delete(DRAMA_PHOTO);
        expect((await source(DRAMA_PHOTO)).status).toBe(404);
    });

    it('should answer 404 for a folder that no drama uses (non-r2 dramas included)', async () => {
        await putEntry('dramas', 'golden', {
            ...drama(3),
            audio: { host: 'app', folder: FOLDER, file: '{no2}.m4a' },
        });
        expect((await source(DRAMA_PHOTO)).status).toBe(404);
    });

    it('should answer 413 above R2_SOURCE_MAX_BYTES', async () => {
        await put(DRAMA_PHOTO, new Uint8Array(SOURCE_MAX_BYTES + 1));
        const response = await source(DRAMA_PHOTO);
        expect(response.status).toBe(413);
    });

    it('should accept exactly R2_SOURCE_MAX_BYTES', async () => {
        await put(DRAMA_PHOTO, new Uint8Array(SOURCE_MAX_BYTES));
        const response = await source(DRAMA_PHOTO);
        expect(response.status).toBe(200);
        await response.arrayBuffer();
    });

    it('should treat a stored image/jpg Content-Type as image/jpeg (S-904)', async () => {
        await put(DRAMA_PHOTO, PHOTO_BYTES, 'image/jpg');
        const response = await source(DRAMA_PHOTO);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('image/jpeg');
        await response.arrayBuffer();
    });

    it('should answer 415 when R2 says the object is not an image', async () => {
        await put(DRAMA_PHOTO, '<script>alert(1)</script>', 'text/html');
        expect((await source(DRAMA_PHOTO)).status).toBe(415);
    });

    it('should serve keys of a drama whose audio.folder has several levels (S-900)', async () => {
        const nested = '廣播劇/黃金少年';
        await putEntry('dramas', 'golden', {
            ...drama(3),
            audio: { host: 'r2', folder: nested, file: '{no2}.m4a' },
        });
        await put(`${nested}/Cover Photo.jpg`, PHOTO_BYTES);
        await put(`${nested}/Season 1/cd cover.png`, PHOTO_BYTES, 'image/png');
        const body = (await (await adminGet('/api/dramas/golden/sources')).json()) as {
            coverPhoto: string;
            arcs: { cdCover: string }[];
        };
        expect(body.coverPhoto).toBe(`${nested}/Cover Photo.jpg`);
        for (const key of [body.coverPhoto, body.arcs[0]?.cdCover ?? '']) {
            const response = await source(key);
            expect(response.status, key).toBe(200);
            await response.arrayBuffer();
        }
        expect((await source(`廣播劇/Cover Photo.jpg`)).status).toBe(404);
    });

    it('should find the key under whichever drama folder scans it (nested drama folders)', async () => {
        const inner = `${FOLDER}/外傳`;
        await putEntry('dramas', 'side', {
            ...drama(3),
            audio: { host: 'r2', folder: inner, file: '{no2}.m4a' },
        });
        await put(`${inner}/Cover Photo.jpg`, PHOTO_BYTES);
        const response = await source(`${inner}/Cover Photo.jpg`);
        expect(response.status).toBe(200);
        await response.arrayBuffer();
        const outer = await source(DRAMA_PHOTO);
        expect(outer.status).toBe(200);
        await outer.arrayBuffer();
    });

    it('should need a session', async () => {
        const response = await call(`/api/r2-source?key=${encodeURIComponent(DRAMA_PHOTO)}`);
        expect(response.status).toBe(401);
    });
});
