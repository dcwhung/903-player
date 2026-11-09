import { env } from 'cloudflare:test';
import { parseCatalogDocument, type CatalogDocument } from '@903-player/catalog';
import { ORIGIN, adminGet, adminPost, call, loginCookie } from './helpers';
import { DISC, TILE, drama, putEntry, seed } from './fixtures';

interface PublishSummary {
    id: number;
    createdAt: string;
    createdBy: string;
    hash: string;
    showCount: number;
    dramaCount: number;
    episodeCount: number;
    rollbackOf: number | null;
    current: boolean;
}

const publishedDocument = async (): Promise<CatalogDocument> => {
    const object = await env.CATALOG.get('catalog/v1/catalog.json');
    return parseCatalogDocument(JSON.parse((await object?.text()) ?? 'null'));
};

const history = async (): Promise<PublishSummary[]> =>
    ((await (await adminGet('/api/publishes')).json()) as { publishes: PublishSummary[] })
        .publishes;

describe('POST /api/publish', () => {
    beforeEach(() => seed(3));

    it('should write a valid catalog.json with worker image URLs to R2', async () => {
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(200);
        const doc = await publishedDocument();
        expect(doc.shows.map((s) => s.id)).toEqual(['badgirl']);
        expect(doc.dramas[0]?.images).toEqual({
            'tile.webp': `${ORIGIN}/catalog/v1/img/${TILE}`,
            'disc.webp': `${ORIGIN}/catalog/v1/img/${DISC}`,
        });
        expect(doc.dramas[0]?.definition).toEqual(drama(3));
    });

    it('should record the publish with counts, hash, author and episode IDs', async () => {
        const body = (await (await adminPost('/api/publish')).json()) as {
            publish: PublishSummary;
        };
        expect(body.publish).toMatchObject({
            id: 1,
            createdBy: 'donald.cw.hung@gmail.com',
            showCount: 1,
            dramaCount: 1,
            episodeCount: 3,
            rollbackOf: null,
            current: true,
        });
        expect(body.publish.hash).toMatch(/^[0-9a-f]{64}$/);
        const ids = await env.DB.prepare('SELECT episode_ids FROM publishes').first<string>(
            'episode_ids',
        );
        expect(JSON.parse(ids ?? '[]')).toEqual([
            'drama:golden:season-1:1',
            'drama:golden:season-1:2',
            'drama:golden:season-1:3',
        ]);
    });

    it('should allow a publish that only adds episodes', async () => {
        await adminPost('/api/publish');
        await putEntry('dramas', 'golden', drama(4));
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(200);
        expect((await publishedDocument()).dramas[0]?.definition).toEqual(drama(4));
    });

    it('should refuse with 409 and list the IDs when episodes would disappear', async () => {
        await adminPost('/api/publish');
        await putEntry('dramas', 'golden', drama(1));
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(409);
        expect(await response.json()).toMatchObject({
            missing: ['drama:golden:season-1:2', 'drama:golden:season-1:3'],
        });
        expect((await publishedDocument()).dramas[0]?.definition).toEqual(drama(3));
        expect(await history()).toHaveLength(1);
    });

    it('should publish anyway with force=1', async () => {
        await adminPost('/api/publish');
        await putEntry('dramas', 'golden', drama(1));
        expect((await adminPost('/api/publish?force=1')).status).toBe(200);
        expect((await publishedDocument()).dramas[0]?.definition).toEqual(drama(1));
    });

    it('should reject a definition the shared validator rejects, writing nothing', async () => {
        await putEntry('dramas', 'golden', { ...drama(3), kind: 'weekly' });
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(422);
        expect(await env.CATALOG.head('catalog/v1/catalog.json')).toBeNull();
    });

    it('should reject an entry whose image was never uploaded', async () => {
        await putEntry('dramas', 'golden', drama(3), {
            'tile.webp': TILE,
            'disc.webp': '1111111111111111.webp',
        });
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(422);
        expect(await response.text()).toContain('1111111111111111.webp');
    });

    it('should need a session', async () => {
        const response = await call('/api/publish', {
            method: 'POST',
            headers: { origin: ORIGIN },
        });
        expect(response.status).toBe(401);
    });
});

describe('GET /api/publishes + rollback', () => {
    beforeEach(async () => {
        await seed(3);
        await adminPost('/api/publish');
        await putEntry('dramas', 'golden', drama(4));
        await adminPost('/api/publish');
    });

    it('should list publishes newest first and mark the current one', async () => {
        const list = await history();
        expect(list.map((p) => [p.id, p.episodeCount, p.current])).toEqual([
            [2, 4, true],
            [1, 3, false],
        ]);
    });

    it('should apply the ID guard to a rollback too', async () => {
        const response = await adminPost('/api/publishes/1/rollback');
        expect(response.status).toBe(409);
        expect(await response.json()).toMatchObject({ missing: ['drama:golden:season-1:4'] });
    });

    it('should republish the old snapshot as a new publish with force', async () => {
        const response = await adminPost('/api/publishes/1/rollback?force=1');
        expect(response.status).toBe(200);
        expect((await publishedDocument()).dramas[0]?.definition).toEqual(drama(3));
        const [latest, , first] = await history();
        expect(latest).toMatchObject({ id: 3, rollbackOf: 1, episodeCount: 3, current: true });
        expect(latest?.hash).toBe(first?.hash);
    });

    it('should answer 404 for an unknown publish', async () => {
        expect((await adminPost('/api/publishes/99/rollback')).status).toBe(404);
        expect((await adminPost('/api/publishes/abc/rollback')).status).toBe(404);
    });

    it('should keep D1 entries untouched', async () => {
        await adminPost('/api/publishes/1/rollback?force=1');
        const row = await env.DB.prepare(
            "SELECT definition FROM entries WHERE id = 'golden'",
        ).first<string>('definition');
        expect(JSON.parse(row ?? '{}')).toEqual(drama(4));
    });

    it('should need the same origin', async () => {
        const response = await call('/api/publishes/1/rollback', {
            method: 'POST',
            headers: { cookie: await loginCookie() },
        });
        expect(response.status).toBe(403);
    });
});
