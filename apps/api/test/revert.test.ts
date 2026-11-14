/* 還原未發佈改動（0.11.0）：GET /api/entries/:kind/:id 嘅 published + POST …/revert */
import { env } from 'cloudflare:test';
import { adminGet, adminPost, adminRequest } from './helpers';
import { DISC, SHOW, TILE, drama, putEntry, seed } from './fixtures';

type Json = Record<string, unknown>;

const NEW_TILE = 'aaaaaaaaaaaaaaaa.webp';
const SEASON_2 = { id: 'season-2', name: 'Season 2', addedAt: '2026-10-25', episodes: 2 };

/** 兩個短篇嘅劇（短篇刪咗再加返要用） */
const twoArcs = (): Json => {
    const base = drama(3);
    return { ...base, arcs: [...(base.arcs as Json[]), SEASON_2] };
};

const getJson = async (kind: string, id: string) =>
    (await (await adminGet(`/api/entries/${kind}/${id}`)).json()) as {
        definition: Json;
        images: Json;
        published: { definition: Json; images: Json } | null;
    };

const etagOf = async (kind: string, id: string) =>
    (await adminGet(`/api/entries/${kind}/${id}`)).headers.get('etag') ?? '';

const revert = async (kind: string, id: string, body: unknown, etag?: string) =>
    adminRequest('POST', `/api/entries/${kind}/${id}/revert`, {
        body,
        headers: { 'if-match': etag ?? (await etagOf(kind, id)) },
    });

const stored = async (kind: string, id: string) => {
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

const arcsOf = (definition: Json) => definition.arcs as Json[];

const putNewTileAsset = () =>
    env.DB.prepare('INSERT INTO assets (hash, content_type, bytes, created_at) VALUES (?, ?, ?, ?)')
        .bind(NEW_TILE.split('.')[0], 'image/webp', 1, '2026-11-08T00:00:00Z')
        .run();

beforeEach(async () => {
    await seed(3);
    await putNewTileAsset();
    await putEntry('dramas', 'golden', twoArcs());
});

describe('GET /api/entries/:kind/:id published', () => {
    it('should be null when nothing has been published', async () => {
        expect((await getJson('dramas', 'golden')).published).toBeNull();
    });

    it('should return the latest published definition and image names', async () => {
        await adminPost('/api/publish');
        await putEntry('dramas', 'golden', { ...twoArcs(), name: '新名' });
        const body = await getJson('dramas', 'golden');
        expect(body.definition.name).toBe('新名');
        expect(body.published?.definition.name).toBe('黃金少年');
        expect(body.published?.images).toEqual({ 'tile.webp': TILE, 'disc.webp': DISC });
    });

    it('should be null when the entry is not in the published document', async () => {
        await adminPost('/api/publish');
        await putEntry('shows', 'new-show', { ...SHOW, enabled: false });
        expect((await getJson('shows', 'new-show')).published).toBeNull();
    });

    it('should be null when the published document cannot be parsed (fail closed)', async () => {
        await adminPost('/api/publish');
        await env.DB.prepare("UPDATE publishes SET document = '{broken'").run();
        expect((await getJson('dramas', 'golden')).published).toBeNull();
    });
});

describe('POST /api/entries/:kind/:id/revert', () => {
    beforeEach(async () => {
        await adminPost('/api/publish');
    });

    it('should revert a text field and answer like PUT', async () => {
        await putEntry('dramas', 'golden', { ...twoArcs(), name: '新名', description: '加咗' });
        const response = await revert('dramas', 'golden', {
            items: [{ field: 'name' }, { field: 'description' }],
        });
        expect(response.status).toBe(200);
        const body = (await response.json()) as Json;
        expect(body).toMatchObject({ draft: false, warnings: { missingEpisodeIds: [] } });
        expect(response.headers.get('etag')).toBe(`"${String(body.updatedAt)}"`);
        const { definition } = await stored('dramas', 'golden');
        expect(definition.name).toBe('黃金少年');
        expect('description' in definition).toBe(false);
    });

    it('should revert the theme', async () => {
        const theme = { ...(twoArcs().theme as Json), accent: '#000000' };
        await putEntry('dramas', 'golden', { ...twoArcs(), theme });
        expect((await revert('dramas', 'golden', { items: [{ field: 'theme' }] })).status).toBe(
            200,
        );
        expect((await stored('dramas', 'golden')).definition.theme).toEqual(twoArcs().theme);
    });

    it('should revert tile with its image and drop the stale image key', async () => {
        await putEntry(
            'dramas',
            'golden',
            { ...twoArcs(), tile: 'tile-2.webp' },
            { 'tile.webp': TILE, 'tile-2.webp': NEW_TILE, 'disc.webp': DISC },
        );
        expect((await revert('dramas', 'golden', { items: [{ field: 'tile' }] })).status).toBe(200);
        const { definition, images } = await stored('dramas', 'golden');
        expect(definition.tile).toBe('tile.webp');
        expect(images).toEqual({ 'tile.webp': TILE, 'disc.webp': DISC });
    });

    it('should restore the image when only the file behind tile changed', async () => {
        await putEntry('dramas', 'golden', twoArcs(), { 'tile.webp': NEW_TILE, 'disc.webp': DISC });
        await revert('dramas', 'golden', { items: [{ field: 'tile' }] });
        expect((await stored('dramas', 'golden')).images).toEqual({
            'tile.webp': TILE,
            'disc.webp': DISC,
        });
    });

    it('should revert one arc field and leave the other arcs alone', async () => {
        const changed = twoArcs();
        const [first, second] = arcsOf(changed);
        await putEntry('dramas', 'golden', {
            ...changed,
            arcs: [
                { ...first, displayName: '第一季' },
                { ...second, displayName: '第二季' },
            ],
        });
        const response = await revert('dramas', 'golden', {
            items: [{ arc: 'season-1', field: 'displayName' }],
        });
        expect(response.status).toBe(200);
        const arcs = arcsOf((await stored('dramas', 'golden')).definition);
        expect('displayName' in (arcs[0] ?? {})).toBe(false);
        expect(arcs[1]?.displayName).toBe('第二季');
    });

    it('should put an arc deleted in D1 back at its published position', async () => {
        const base = twoArcs();
        const [first, second] = arcsOf(base);
        const third = { id: 'season-3', name: 'Season 3', enabled: false, episodes: 1 };
        await putEntry('dramas', 'golden', { ...base, arcs: [second, third] });
        const response = await revert('dramas', 'golden', {
            items: [{ arc: 'season-1', field: '*' }],
        });
        expect(response.status).toBe(200);
        expect(arcsOf((await stored('dramas', 'golden')).definition)).toEqual([
            first,
            second,
            third,
        ]);
    });

    it('should put a deleted arc back when any of its fields is reverted', async () => {
        const [first, second] = arcsOf(twoArcs());
        await putEntry('dramas', 'golden', { ...twoArcs(), arcs: [first] });
        const response = await revert('dramas', 'golden', {
            items: [{ arc: 'season-2', field: 'name' }],
        });
        expect(response.status).toBe(200);
        expect(arcsOf((await stored('dramas', 'golden')).definition)).toEqual([first, second]);
    });

    it('should revert listing (enabled) and a scheduled removedAt', async () => {
        await putEntry('dramas', 'golden', {
            ...twoArcs(),
            enabled: false,
            removedAt: '2099-01-01',
        });
        const response = await revert('dramas', 'golden', {
            items: [{ field: 'enabled' }, { field: 'removedAt' }],
        });
        expect(response.status).toBe(200);
        const { definition } = await stored('dramas', 'golden');
        expect(definition.enabled).toBe(true);
        expect('removedAt' in definition).toBe(false);
    });

    it('should not get in the way of the next publish', async () => {
        await putEntry('dramas', 'golden', { ...twoArcs(), name: '新名' });
        await revert('dramas', 'golden', { items: [{ field: 'name' }] });
        expect((await adminPost('/api/publish')).status).toBe(200);
    });

    it('should answer 412 for a stale If-Match', async () => {
        const response = await revert('dramas', 'golden', { items: [{ field: 'name' }] }, '"old"');
        expect(response.status).toBe(412);
    });

    it('should answer 412 without If-Match', async () => {
        const response = await adminRequest('POST', '/api/entries/dramas/golden/revert', {
            body: { items: [{ field: 'name' }] },
        });
        expect(response.status).toBe(412);
    });

    it.each([
        [{}],
        [{ items: [] }],
        [{ items: [{ field: 1 }] }],
        [{ items: [{ field: 'name', arc: 2 }] }],
        [{ items: [{ field: 'name', extra: true }] }],
        [{ items: [{ field: 'arcs' }] }],
        [{ items: [{ field: 'noSuchField' }] }],
        [{ items: [{ arc: 'no-such-arc', field: 'name' }] }],
    ])('should answer 400 for a bad body %j', async (body) => {
        expect((await revert('dramas', 'golden', body)).status).toBe(400);
    });

    it('should answer 409 for an arc that was never published', async () => {
        const base = twoArcs();
        const extra = { id: 'season-3', name: 'Season 3', enabled: false, episodes: 1 };
        await putEntry('dramas', 'golden', { ...base, arcs: [...arcsOf(base), extra] });
        const response = await revert('dramas', 'golden', {
            items: [{ arc: 'season-3', field: 'name' }],
        });
        expect(response.status).toBe(409);
    });

    it('should answer 409 for an entry that was never published', async () => {
        await putEntry('shows', 'new-show', { ...SHOW, enabled: false });
        const response = await revert('shows', 'new-show', { items: [{ field: 'name' }] });
        expect(response.status).toBe(409);
    });

    it('should answer 404 for an unknown entry', async () => {
        const response = await revert('shows', 'nope', { items: [{ field: 'name' }] }, '"x"');
        expect(response.status).toBe(404);
    });
});
