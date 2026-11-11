import { env } from 'cloudflare:test';
import { parseCatalogDocument, type CatalogDocument } from '@903-player/catalog';
import { ORIGIN, adminGet, adminPost, call, loginCookie } from './helpers';
import { DISC, SHOW, TILE, drama, markDraft, putEntry, seed } from './fixtures';
import { commitPublish, documentFromEntries, validateDocument } from '../src/catalog/publish';
import { listAssetHashes, listEntries } from '../src/catalog/store';

interface PublishSummary {
    id: number;
    createdAt: string;
    createdBy: string;
    hash: string;
    showCount: number;
    dramaCount: number;
    episodeCount: number;
    rollbackOf: number | null;
    status: 'ok' | 'failed';
    error: string | null;
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

    it('should not treat unlisting an arc (enabled: false) as disappearing IDs', async () => {
        await adminPost('/api/publish');
        const unlisted = drama(3);
        unlisted.arcs = [{ ...(unlisted.arcs as Record<string, unknown>[])[0], enabled: false }];
        await putEntry('dramas', 'golden', unlisted);
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(200);
        expect(await response.json()).not.toHaveProperty('unchanged');
    });

    it('should only lock episode IDs that were listed when published (W-707)', async () => {
        const withArcs = (arcs: Record<string, unknown>[]) => ({ ...drama(3), arcs });
        const listed = (drama(3).arcs as Record<string, unknown>[])[0] ?? {};
        const placeholder = { id: 'arc-01', name: 'Season 2', episodes: 2, enabled: false };
        await putEntry('dramas', 'golden', withArcs([listed, placeholder]));
        expect((await adminPost('/api/publish')).status).toBe(200);
        const stored = await env.DB.prepare('SELECT episode_ids FROM publishes').first<string>(
            'episode_ids',
        );
        expect(JSON.parse(stored ?? '[]')).not.toContain('drama:golden:arc-01:1');
        // admin 將 placeholder 改做正式 ID：從未上架，唔當消失
        await putEntry('dramas', 'golden', withArcs([listed, { ...placeholder, id: 'season-2' }]));
        expect((await adminPost('/api/publish')).status).toBe(200);
    });

    it('should keep locking a listed arc after it is unlisted (W-707)', async () => {
        await adminPost('/api/publish');
        const arc = (drama(3).arcs as Record<string, unknown>[])[0] ?? {};
        await putEntry('dramas', 'golden', { ...drama(3), arcs: [{ ...arc, enabled: false }] });
        expect((await adminPost('/api/publish')).status).toBe(200);
        const renamed = { ...arc, id: 'season-x', enabled: false };
        await putEntry('dramas', 'golden', { ...drama(3), arcs: [renamed] });
        expect((await adminPost('/api/publish')).status).toBe(409);
    });

    it('should still refuse removing a listed arc (W-707)', async () => {
        await putEntry('dramas', 'golden', {
            ...drama(3),
            arcs: [
                ...(drama(3).arcs as Record<string, unknown>[]),
                { id: 'season-2', name: 'Season 2', episodes: 1 },
            ],
        });
        await adminPost('/api/publish');
        await putEntry('dramas', 'golden', drama(3));
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(409);
        expect(await response.json()).toMatchObject({ missing: ['drama:golden:season-2:1'] });
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

    it('should reject an image name outside the hashed file pattern (S-772)', async () => {
        await putEntry('dramas', 'golden', drama(3), {
            'tile.webp': TILE,
            'disc.webp': `${DISC.split('.')[0]}.png`,
        });
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(422);
        expect(await response.text()).toContain('.png');
    });

    it('should answer unchanged without a new row or R2 write when nothing changed (S-780)', async () => {
        await adminPost('/api/publish');
        const before = await env.CATALOG.head('catalog/v1/catalog.json');
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ unchanged: true, publish: { id: 1 } });
        expect(await history()).toHaveLength(1);
        const after = await env.CATALOG.head('catalog/v1/catalog.json');
        expect(after?.uploaded).toEqual(before?.uploaded);
    });

    it('should publish unchanged content anyway with force=1 (S-780)', async () => {
        await adminPost('/api/publish');
        const response = await adminPost('/api/publish?force=1');
        expect(await response.json()).toMatchObject({ publish: { id: 2 } });
        expect(await history()).toHaveLength(2);
    });

    it('should need a session', async () => {
        const response = await call('/api/publish', {
            method: 'POST',
            headers: { origin: ORIGIN },
        });
        expect(response.status).toBe(401);
    });
});

describe('commitPublish (S-767)', () => {
    beforeEach(() => seed(3));

    const validated = async () =>
        validateDocument(
            documentFromEntries(await listEntries(env.DB), {
                origin: ORIGIN,
                assets: await listAssetHashes(env.DB),
                generatedAt: '2026-11-10T00:00:00.000Z',
            }),
        );

    it('should record the publish before writing R2 and drop it when the R2 write fails', async () => {
        const failing = {
            ...env,
            CATALOG: {
                put: async () => {
                    const rows = await env.DB.prepare('SELECT COUNT(*) AS n FROM publishes').first(
                        'n',
                    );
                    expect(rows).toBe(1);
                    throw new Error('R2 down');
                },
            } as unknown as R2Bucket,
        };
        const options = { createdBy: 'x', force: false, rollbackOf: null };
        await expect(commitPublish(failing, await validated(), options)).rejects.toThrow('R2 down');
        expect(await history()).toHaveLength(0);
        expect(await env.CATALOG.head('catalog/v1/catalog.json')).toBeNull();
    });

    /** R2 寫唔到、之後 DELETE publishes 都失敗（D1 一時唔得）嘅 env */
    const doubleFailure = () => {
        const db = new Proxy(env.DB, {
            get: (target, key) =>
                key === 'prepare'
                    ? (sql: string) => {
                          if (sql.startsWith('DELETE FROM publishes')) throw new Error('D1 down');
                          return target.prepare(sql);
                      }
                    : (Reflect.get(target, key) as unknown),
        });
        const catalog = {
            put: async () => {
                throw new Error('R2 down');
            },
        } as unknown as R2Bucket;
        return { ...env, DB: db, CATALOG: catalog };
    };

    const statuses = async () =>
        (await env.DB.prepare('SELECT id, status FROM publishes ORDER BY id').all()).results;

    it('should mark the row failed when dropping it fails too, and ignore it afterwards (S-786)', async () => {
        const options = { createdBy: 'x', force: false, rollbackOf: null };
        await expect(commitPublish(doubleFailure(), await validated(), options)).rejects.toThrow(
            'R2 down',
        );
        expect(await statuses()).toEqual([{ id: 1, status: 'failed' }]);
        // 失敗原因記低（migration 0004），上下架記錄顯示
        const [failed] = await history();
        expect(failed).toMatchObject({ id: 1, status: 'failed', error: 'R2 down' });
        // 同一份內容再 publish：唔可以當 unchanged（R2 根本未寫過）
        const response = await adminPost('/api/publish');
        expect(await response.json()).not.toHaveProperty('unchanged');
        expect(await statuses()).toEqual([
            { id: 1, status: 'failed' },
            { id: 2, status: 'ok' },
        ]);
        expect(await env.CATALOG.head('catalog/v1/catalog.json')).not.toBeNull();
    });

    it('should leave a failed row out of the ID guard and the current marker (S-786)', async () => {
        await adminPost('/api/publish');
        await putEntry('dramas', 'golden', drama(4));
        const options = { createdBy: 'x', force: false, rollbackOf: null };
        await expect(commitPublish(doubleFailure(), await validated(), options)).rejects.toThrow();
        // 3 集版本：同 failed 嗰行（4 集）比會少一集，但最新 ok 嗰行（3 集）冇少 → 唔擋
        await putEntry('dramas', 'golden', drama(3));
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ unchanged: true, publish: { id: 1 } });
        const list = await history();
        expect(list.map((p) => [p.id, p.status, p.current])).toEqual([
            [2, 'failed', false],
            [1, 'ok', true],
        ]);
    });
});

describe('GET /api/publishes + rollback (restore status into D1)', () => {
    beforeEach(async () => {
        await seed(3);
        await adminPost('/api/publish');
        await putEntry('dramas', 'golden', drama(4));
        await adminPost('/api/publish');
    });

    const stored = async (kind: string, id: string) =>
        JSON.parse(
            (await env.DB.prepare('SELECT definition FROM entries WHERE kind = ? AND id = ?')
                .bind(kind, id)
                .first<string>('definition')) ?? 'null',
        ) as Record<string, unknown> | null;

    const pendingChanges = async () =>
        ((await (await adminGet('/api/changes')).json()) as { changes: { items: unknown[] } })
            .changes.items;

    it('should list publishes newest first and mark the current one', async () => {
        const list = await history();
        expect(list.map((p) => [p.id, p.episodeCount, p.current])).toEqual([
            [2, 4, true],
            [1, 3, false],
        ]);
    });

    it('should keep episodes added later (no 409): only the listed status is restored', async () => {
        const response = await adminPost('/api/publishes/1/rollback');
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ unchanged: true });
        expect(await stored('dramas', 'golden')).toEqual(drama(4));
    });

    it('should relist A and unlist what was added after #1 (the user example)', async () => {
        // #3：劇 A（golden）下架、A 加咗短篇 season-2；新劇 later 嘅短篇 B 上架
        const later = drama(4);
        const arcB = { id: 'b', name: 'B', addedAt: '2026-10-25', episodes: 2 };
        await putEntry('dramas', 'golden', {
            ...later,
            enabled: false,
            arcs: [...(later.arcs as unknown[]), { ...arcB, id: 'season-2' }],
        });
        await putEntry('dramas', 'later', { ...drama(1), name: '新劇', arcs: [arcB] });
        await putEntry('shows', 'newshow', { ...SHOW, name: '新節目' });
        expect((await adminPost('/api/publish')).status).toBe(200);

        const response = await adminPost('/api/publishes/1/rollback');
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ publish: { id: 4, rollbackOf: 1 } });
        const golden = await stored('dramas', 'golden');
        expect(golden?.enabled).toBe(true);
        expect((golden?.arcs as Record<string, unknown>[]).map((a) => [a.id, a.enabled])).toEqual([
            ['season-1', undefined],
            ['season-2', false],
        ]);
        expect((await stored('dramas', 'later'))?.enabled).toBe(false);
        expect((await stored('shows', 'newshow'))?.enabled).toBe(false);
        expect((await stored('shows', 'badgirl'))?.enabled).toBeUndefined();
        // B 上過架（#3 鎖咗），落架之後集數 ID 仍然喺 document：ID 守衛過、仲鎖住
        const ids = JSON.parse(
            (await env.DB.prepare('SELECT episode_ids FROM publishes WHERE id = 4').first<string>(
                'episode_ids',
            )) ?? '[]',
        ) as string[];
        expect(ids).toContain('drama:later:b:1');
        expect((await publishedDocument()).dramas.map((d) => d.id)).toContain('later');
        expect(await pendingChanges()).toEqual([]);
        const [latest] = await history();
        expect(latest).toMatchObject({ id: 4, rollbackOf: 1, current: true });
    });

    it('should bump updated_at (ETag) of the entries it changes and leave drafts alone', async () => {
        await putEntry('dramas', 'golden', { ...drama(4), enabled: false });
        await putEntry('dramas', 'draft-one', { ...drama(1), enabled: false });
        await markDraft('dramas', 'draft-one');
        await adminPost('/api/publish');
        const before = await env.DB.prepare(
            "SELECT id, updated_at, definition FROM entries WHERE kind = 'dramas' ORDER BY id",
        ).all<{ id: string; updated_at: string; definition: string }>();
        expect((await adminPost('/api/publishes/1/rollback')).status).toBe(200);
        const after = await env.DB.prepare(
            "SELECT id, updated_at, definition FROM entries WHERE kind = 'dramas' ORDER BY id",
        ).all<{ id: string; updated_at: string; definition: string }>();
        const [draftBefore, goldenBefore] = before.results;
        const [draftAfter, goldenAfter] = after.results;
        expect(draftAfter).toEqual(draftBefore);
        expect(goldenAfter?.updated_at).not.toBe(goldenBefore?.updated_at);
    });

    it('should put D1 back when writing the catalog fails', async () => {
        await putEntry('dramas', 'golden', { ...drama(4), enabled: false });
        await adminPost('/api/publish');
        const failing = { ...env, CATALOG: { put: () => Promise.reject(new Error('R2 down')) } };
        const { rollbackToPublish } = await import('../src/catalog/rollback');
        await expect(
            rollbackToPublish(failing as unknown as typeof env, 1, {
                createdBy: 'x',
                force: false,
            }),
        ).rejects.toThrow('R2 down');
        expect((await stored('dramas', 'golden'))?.enabled).toBe(false);
        expect(await pendingChanges()).toEqual([]);
    });

    it('should answer 404 for an unknown publish', async () => {
        expect((await adminPost('/api/publishes/99/rollback')).status).toBe(404);
        expect((await adminPost('/api/publishes/abc/rollback')).status).toBe(404);
    });

    it('should need the same origin', async () => {
        const response = await call('/api/publishes/1/rollback', {
            method: 'POST',
            headers: { cookie: await loginCookie() },
        });
        expect(response.status).toBe(403);
    });
});
