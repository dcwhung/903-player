import { env } from 'cloudflare:test';
import { adminGet, adminPost, adminRequest, call, loginCookie, ORIGIN } from './helpers';
import { DISC, SHOW, TILE, drama, putEntry, seed } from './fixtures';

type Json = Record<string, unknown>;

const IMAGES = { 'tile.webp': TILE, 'disc.webp': DISC };
const BODY_LIMIT_BYTES = 256 * 1024;

const etagOf = async (kind: string, id: string): Promise<string> =>
    (await adminGet(`/api/entries/${kind}/${id}`)).headers.get('etag') ?? '';

const put = (kind: string, id: string, body: unknown, headers: Record<string, string>) =>
    adminRequest('PUT', `/api/entries/${kind}/${id}`, { body, headers });

const storedDefinition = async (id: string): Promise<Json | null> => {
    const text = await env.DB.prepare(
        "SELECT definition FROM entries WHERE kind = 'dramas' AND id = ?",
    )
        .bind(id)
        .first<string>('definition');
    return text === null ? null : (JSON.parse(text) as Json);
};

beforeEach(() => seed(3));

describe('GET /api/entries', () => {
    it('should list every entry with kind, id, name, enabled and updatedAt', async () => {
        const response = await adminGet('/api/entries');
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            entries: [
                {
                    kind: 'dramas',
                    id: 'golden',
                    name: '黃金少年',
                    enabled: true,
                    draft: false,
                    updatedAt: '2026-11-08T00:00:00Z',
                    published: false,
                    publishedArcs: [],
                },
                {
                    kind: 'shows',
                    id: 'badgirl',
                    name: 'Bad Girl大過佬',
                    enabled: true,
                    draft: false,
                    updatedAt: '2026-11-08T00:00:00Z',
                    published: false,
                },
            ],
        });
    });

    it('should mark entries and arcs that the latest ok publish has ever listed', async () => {
        await adminPost('/api/publish');
        const golden = drama(3);
        const arcs = golden.arcs as Json[];
        // 新短篇（下架、未上過架）+ 已上過架嘅 season-1 轉下架：再發佈
        await putEntry('dramas', 'golden', {
            ...golden,
            arcs: [
                { ...arcs[0], enabled: false },
                { id: 'later', name: '後加', episodes: 2, enabled: false },
            ],
        });
        await putEntry('dramas', 'fresh', { ...golden, name: '新劇', enabled: false });
        await adminPost('/api/publish');
        const { entries } = (await (await adminGet('/api/entries')).json()) as { entries: Json[] };
        const byId = Object.fromEntries(entries.map((e) => [e.id, e]));
        expect(byId.golden).toMatchObject({ published: true, publishedArcs: ['season-1'] });
        expect(byId.fresh).toMatchObject({ published: false, publishedArcs: [] });
        expect(byId.badgirl).toMatchObject({ published: true });
        expect(byId.badgirl).not.toHaveProperty('publishedArcs');
    });

    it('should need a session', async () => {
        expect((await call('/api/entries')).status).toBe(401);
    });
});

describe('GET /api/entries published for dramas across publishes (S-845)', () => {
    it('should keep arcs listed in an earlier ok publish after a newer one dropped them', async () => {
        await adminPost('/api/publish');
        // 較新嘅 ok publish（例如還原咗去舊版）冇 season-1 嘅集數
        await env.DB.prepare(
            `INSERT INTO publishes (created_at, created_by, hash, document, episode_ids, show_count,
             drama_count, episode_count) VALUES ('2026-11-12T00:00:00Z', 'x', 'h', '{}', '[]', 0, 0, 0)`,
        ).run();
        const { entries } = (await (await adminGet('/api/entries')).json()) as { entries: Json[] };
        const golden = entries.find((e) => e.id === 'golden');
        expect(golden).toMatchObject({ published: true, publishedArcs: ['season-1'] });
    });
});

describe('GET /api/entries published for shows (W-716)', () => {
    const showOf = async (id: string) => {
        const { entries } = (await (await adminGet('/api/entries')).json()) as { entries: Json[] };
        return entries.find((e) => e.kind === 'shows' && e.id === id);
    };

    it('should keep a show created disabled and never listed at published: false after a publish', async () => {
        await putEntry('shows', 'newshow', { ...SHOW, enabled: false });
        await adminPost('/api/publish');
        expect(await showOf('newshow')).toMatchObject({ published: false });
        expect(await showOf('badgirl')).toMatchObject({ published: true });
    });

    it('should keep published: true for a show listed before, then disabled and published again', async () => {
        await adminPost('/api/publish');
        await putEntry('shows', 'badgirl', { ...SHOW, enabled: false });
        await adminPost('/api/publish');
        expect(await showOf('badgirl')).toMatchObject({ published: true });
    });
});

describe('GET /api/entries/:kind/:id', () => {
    it('should return definition, images and updatedAt with the ETag', async () => {
        const response = await adminGet('/api/entries/dramas/golden');
        expect(response.headers.get('etag')).toBe('"2026-11-08T00:00:00Z"');
        expect(await response.json()).toEqual({
            definition: drama(3),
            images: IMAGES,
            draft: false,
            updatedAt: '2026-11-08T00:00:00Z',
        });
    });

    it('should answer 404 for an unknown entry and 400 for a bad kind or id', async () => {
        expect((await adminGet('/api/entries/dramas/nope')).status).toBe(404);
        expect((await adminGet('/api/entries/weekly/golden')).status).toBe(400);
        expect((await adminGet('/api/entries/dramas/Bad_ID')).status).toBe(400);
    });
});

describe('PUT /api/entries/:kind/:id', () => {
    it('should replace an entry with a matching If-Match and return a new ETag', async () => {
        const etag = await etagOf('dramas', 'golden');
        const response = await put(
            'dramas',
            'golden',
            { definition: drama(4), images: IMAGES },
            { 'if-match': etag },
        );
        expect(response.status).toBe(200);
        const newEtag = response.headers.get('etag');
        expect(newEtag).not.toBe(etag);
        expect(await storedDefinition('golden')).toEqual(drama(4));
        expect(await etagOf('dramas', 'golden')).toBe(newEtag);
    });

    it('should answer 412 for a stale or missing If-Match and keep the entry', async () => {
        const body = { definition: drama(4), images: IMAGES };
        expect((await put('dramas', 'golden', body, { 'if-match': '"old"' })).status).toBe(412);
        expect((await put('dramas', 'golden', body, {})).status).toBe(412);
        expect(await storedDefinition('golden')).toEqual(drama(3));
    });

    it('should give every write a new ETag even within the same millisecond', async () => {
        const first = await put(
            'dramas',
            'golden',
            { definition: drama(4), images: IMAGES },
            {
                'if-match': await etagOf('dramas', 'golden'),
            },
        );
        const etag = first.headers.get('etag') ?? '';
        const second = await put(
            'dramas',
            'golden',
            { definition: drama(5), images: IMAGES },
            { 'if-match': etag },
        );
        expect(second.status).toBe(200);
        expect(second.headers.get('etag')).not.toBe(etag);
        const stale = await put(
            'dramas',
            'golden',
            { definition: drama(6), images: IMAGES },
            { 'if-match': etag },
        );
        expect(stale.status).toBe(412);
    });

    it('should create a new entry only with If-None-Match: *', async () => {
        const body = { definition: { ...drama(2), name: '新劇' }, images: IMAGES };
        expect((await put('dramas', 'new-one', body, {})).status).toBe(412);
        const created = await put('dramas', 'new-one', body, { 'if-none-match': '*' });
        expect(created.status).toBe(201);
        expect(created.headers.get('etag')).toMatch(/^".+"$/);
        expect((await put('dramas', 'new-one', body, { 'if-none-match': '*' })).status).toBe(412);
    });

    it('should answer 422 with the field error for a definition the validator rejects', async () => {
        const etag = await etagOf('dramas', 'golden');
        const bad = { ...drama(3), kind: 'weekly' };
        const response = await put(
            'dramas',
            'golden',
            { definition: bad, images: IMAGES },
            { 'if-match': etag },
        );
        expect(response.status).toBe(422);
        expect(JSON.stringify(await response.json())).toContain('kind');
        expect(await storedDefinition('golden')).toEqual(drama(3));
    });

    it('should answer 422 for images that are not uploaded or not <hash>.<ext> (S-772)', async () => {
        const etag = await etagOf('dramas', 'golden');
        for (const disc of ['1111111111111111.webp', `${DISC.split('.')[0]}.png`]) {
            const images = { 'tile.webp': TILE, 'disc.webp': disc };
            const response = await put(
                'dramas',
                'golden',
                { definition: drama(3), images },
                { 'if-match': etag },
            );
            expect(response.status).toBe(422);
            expect(await response.text()).toContain(disc);
        }
    });

    it('should validate shows with the show validator', async () => {
        const etag = await etagOf('shows', 'badgirl');
        const response = await put(
            'shows',
            'badgirl',
            { definition: { ...SHOW, airDays: [9] }, images: IMAGES },
            { 'if-match': etag },
        );
        expect(response.status).toBe(422);
    });

    it('should answer 400 for a body that is not { definition, images } JSON', async () => {
        const etag = await etagOf('dramas', 'golden');
        expect((await put('dramas', 'golden', 'not json', { 'if-match': etag })).status).toBe(400);
        expect(
            (await put('dramas', 'golden', { definition: drama(3) }, { 'if-match': etag })).status,
        ).toBe(400);
    });

    it('should answer 413 for a body over 256 KB', async () => {
        const etag = await etagOf('dramas', 'golden');
        const huge = {
            definition: { ...drama(3), padding: 'x'.repeat(BODY_LIMIT_BYTES) },
            images: IMAGES,
        };
        expect((await put('dramas', 'golden', huge, { 'if-match': etag })).status).toBe(413);
    });

    it('should warn about episode IDs that would disappear compared with the latest publish', async () => {
        await adminPost('/api/publish');
        const etag = await etagOf('dramas', 'golden');
        const response = await put(
            'dramas',
            'golden',
            { definition: drama(1), images: IMAGES },
            { 'if-match': etag },
        );
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
            warnings: {
                missingEpisodeIds: ['drama:golden:season-1:2', 'drama:golden:season-1:3'],
            },
        });
    });

    it('should need the same origin', async () => {
        const response = await call('/api/entries/dramas/golden', {
            method: 'PUT',
            headers: { cookie: await loginCookie(), 'if-match': await etagOf('dramas', 'golden') },
            body: JSON.stringify({ definition: drama(4), images: IMAGES }),
        });
        expect(response.status).toBe(403);
        expect(new URL(ORIGIN).protocol).toBe('https:');
    });
});

describe('DELETE /api/entries/:kind/:id', () => {
    it('should delete an entry that was never published, with its schedules', async () => {
        await env.DB.prepare(
            "INSERT INTO schedules (drama_id, arc_id, rule, updated_at) VALUES ('golden', 'season-1', '{}', 'x')",
        ).run();
        expect((await adminRequest('DELETE', '/api/entries/dramas/golden')).status).toBe(204);
        expect(await storedDefinition('golden')).toBeNull();
        const schedules = await env.DB.prepare('SELECT COUNT(*) AS n FROM schedules').first('n');
        expect(schedules).toBe(0);
    });

    it('should refuse with 409 when the latest publish has its episodes', async () => {
        await adminPost('/api/publish');
        const response = await adminRequest('DELETE', '/api/entries/dramas/golden');
        expect(response.status).toBe(409);
        expect(await response.text()).toContain('enabled');
        expect(await storedDefinition('golden')).toEqual(drama(3));
    });

    it('should refuse with 409 for a show in the latest publish', async () => {
        await adminPost('/api/publish');
        expect((await adminRequest('DELETE', '/api/entries/shows/badgirl')).status).toBe(409);
    });

    it('should delete a drama added after the latest publish, and 404 an unknown one', async () => {
        await adminPost('/api/publish');
        await putEntry('dramas', 'later', { ...drama(2), name: '後加' });
        expect((await adminRequest('DELETE', '/api/entries/dramas/later')).status).toBe(204);
        expect((await adminRequest('DELETE', '/api/entries/dramas/nope')).status).toBe(404);
    });

    it('should refuse to delete a show when the latest document cannot be read (S-844)', async () => {
        await env.DB.prepare(
            `INSERT INTO publishes (created_at, created_by, hash, document, episode_ids, show_count,
             drama_count, episode_count) VALUES ('2026-11-12T00:00:00Z', 'x', 'h', 'not json', '[]', 0, 0, 0)`,
        ).run();
        expect((await adminRequest('DELETE', '/api/entries/shows/badgirl')).status).toBe(409);
        // 列表照開到（壞咗嗰份唔計）
        expect((await adminGet('/api/entries')).status).toBe(200);
    });

    it('should answer 412 for a stale If-Match', async () => {
        const response = await adminRequest('DELETE', '/api/entries/dramas/golden', {
            headers: { 'if-match': '"old"' },
        });
        expect(response.status).toBe(412);
    });
});
