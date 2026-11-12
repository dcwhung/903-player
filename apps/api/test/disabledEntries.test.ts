/*
 * Bug：admin 新建節目（enabled: false、tile / disc 指 tile.webp / disc.webp）未上載圖就儲存唔到
 *（422「tile: no file tile.webp in the folder」），上載咗 Banner 之後碟面又擋。
 * 下架嘅 entry 圖未齊照存（寬鬆驗證，標 draft，publish 唔包）；上架先要求有齊圖
 */
import { env } from 'cloudflare:test';
import { adminGet, adminPost, adminRequest } from './helpers';
import { DISC, SHOW, TILE, drama, seed } from './fixtures';

type Json = Record<string, unknown>;

const NEW_SHOW: Json = { ...SHOW, name: 'abc', enabled: false };

const etagOf = async (kind: string, id: string) =>
    (await adminGet(`/api/entries/${kind}/${id}`)).headers.get('etag') ?? '';

const create = (kind: string, id: string, definition: Json, images: Json = {}) =>
    adminRequest('PUT', `/api/entries/${kind}/${id}`, {
        body: { definition, images },
        headers: { 'if-none-match': '*' },
    });

const update = async (kind: string, id: string, definition: Json, images: Json) =>
    adminRequest('PUT', `/api/entries/${kind}/${id}`, {
        body: { definition, images },
        headers: { 'if-match': await etagOf(kind, id) },
    });

const draftFlag = (kind: string, id: string) =>
    env.DB.prepare('SELECT draft FROM entries WHERE kind = ? AND id = ?')
        .bind(kind, id)
        .first<number>('draft');

beforeEach(() => seed(3));

describe('disabled entries without images', () => {
    it('should create a disabled show with no images as a draft', async () => {
        const response = await create('shows', 'abc', NEW_SHOW);
        expect(response.status).toBe(201);
        expect(await response.json()).toMatchObject({ draft: true });
        expect(await draftFlag('shows', 'abc')).toBe(1);
    });

    it('should save the show with only the Banner uploaded (disc still missing)', async () => {
        await create('shows', 'abc', NEW_SHOW);
        const response = await update('shows', 'abc', NEW_SHOW, { 'tile.webp': TILE });
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ draft: true });
    });

    it('should save the show with only the disc uploaded (Banner still missing)', async () => {
        await create('shows', 'abc', NEW_SHOW);
        const response = await update('shows', 'abc', NEW_SHOW, { 'disc.webp': DISC });
        expect(response.status).toBe(200);
    });

    it('should clear the draft once both images are uploaded', async () => {
        await create('shows', 'abc', NEW_SHOW);
        const images = { 'tile.webp': TILE, 'disc.webp': DISC };
        const response = await update('shows', 'abc', NEW_SHOW, images);
        expect(await response.json()).toMatchObject({ draft: false });
        expect(await draftFlag('shows', 'abc')).toBe(0);
    });

    it('should still require both images before a show can be enabled', async () => {
        await create('shows', 'abc', NEW_SHOW);
        const enabled = { ...NEW_SHOW, enabled: true };
        const response = await update('shows', 'abc', enabled, { 'tile.webp': TILE });
        expect(response.status).toBe(422);
        expect(await response.text()).toContain('disc: no file disc.webp in the folder');
    });

    it('should still check uploaded image names and other rules', async () => {
        expect((await create('shows', 'x1', NEW_SHOW, { 'tile.webp': 'nope.webp' })).status).toBe(
            422,
        );
        expect((await create('shows', 'x2', { ...NEW_SHOW, airDays: [9] })).status).toBe(422);
    });

    it('should create a disabled drama without images too', async () => {
        const response = await create('dramas', 'new-one', { ...drama(2), enabled: false });
        expect(response.status).toBe(201);
        expect(await draftFlag('dramas', 'new-one')).toBe(1);
    });

    it('should leave the imageless show out of a publish', async () => {
        await create('shows', 'abc', NEW_SHOW);
        expect((await adminPost('/api/publish')).status).toBe(200);
        const doc = JSON.parse(
            (await env.DB.prepare('SELECT document FROM publishes').first<string>('document')) ??
                '{}',
        ) as { shows: Json[] };
        expect(doc.shows.map((s) => s.id)).toEqual(['badgirl']);
    });

    it('W-714: a published show turned off still needs both images (no silent draft)', async () => {
        expect((await adminPost('/api/publish')).status).toBe(200);
        const current = (await (await adminGet('/api/entries/shows/badgirl')).json()) as {
            definition: Json;
            images: Json;
        };
        const images = Object.fromEntries(
            Object.entries(current.images).filter(([name]) => name !== current.definition.disc),
        );
        const response = await update(
            'shows',
            'badgirl',
            { ...current.definition, enabled: false },
            images,
        );
        expect(response.status).toBe(422);
        expect(await draftFlag('shows', 'badgirl')).toBe(0);
    });

    it('W-714: a published show turned off with full data stays a normal entry', async () => {
        expect((await adminPost('/api/publish')).status).toBe(200);
        const current = (await (await adminGet('/api/entries/shows/badgirl')).json()) as {
            definition: Json;
            images: Json;
        };
        const response = await update(
            'shows',
            'badgirl',
            { ...current.definition, enabled: false },
            current.images,
        );
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ draft: false });
    });

    it('W-714: a published drama turned off with a new arc missing its disc answers 422 (no publish 409)', async () => {
        expect((await adminPost('/api/publish')).status).toBe(200);
        const current = (await (await adminGet('/api/entries/dramas/golden')).json()) as {
            definition: Json & { arcs: Json[] };
            images: Json;
        };
        const definition = {
            ...current.definition,
            enabled: false,
            arcs: [
                ...current.definition.arcs,
                {
                    id: 'season-2',
                    name: 'Season 2',
                    addedAt: '2026-11-01',
                    episodes: 2,
                    disc: 'season-2.webp',
                },
            ],
        };
        const response = await update('dramas', 'golden', definition, current.images);
        expect(response.status).toBe(422);
        expect(await draftFlag('dramas', 'golden')).toBe(0);
        expect((await adminPost('/api/publish')).status).not.toBe(409);
    });
});
