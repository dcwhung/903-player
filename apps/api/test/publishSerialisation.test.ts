/*
 * Publish 序列化（AU-018）：兩個 publish（或者 publish 撞還原）重疊時只可以有一個落地，另一個 409；
 * R2 嘅 catalog.json 同 D1「最新 ok publish」一定係同一份。冇獨立嘅鎖：publishes 行 + R2 條件寫入，
 * 所以中途死咗 / 失敗嘅 publish 唔會擋住之後嘅 publish
 */
import { env } from 'cloudflare:test';
import { ORIGIN, adminPost, call, loginCookie } from './helpers';
import { SHOW, drama, putEntry, seed } from './fixtures';
import {
    commitPublish,
    documentFromEntries,
    PublishConflictError,
    validateDocument,
} from '../src/catalog/publish';
import { insertPublish, latestPublish, listAssetHashes, listEntries } from '../src/catalog/store';

type Json = Record<string, unknown>;

const KEY = 'catalog/v1/catalog.json';
const CONFLICT_BODY = { reason: 'publishConflict' };

const validated = async () =>
    validateDocument(
        documentFromEntries(await listEntries(env.DB), {
            origin: ORIGIN,
            assets: await listAssetHashes(env.DB),
            generatedAt: '2026-11-22T00:00:00.000Z',
            banner: null,
            branding: { icon: null, text: null },
        }),
    );

const rename = (name: string) => putEntry('shows', 'badgirl', { ...SHOW, name });

const baseNow = async () => (await latestPublish(env.DB))?.row.id ?? null;

const options = (base: number | null) => ({ createdBy: 'x', force: false, rollbackOf: null, base });

const rows = async () =>
    (
        await env.DB.prepare('SELECT id, hash, status FROM publishes ORDER BY id').all<{
            id: number;
            hash: string;
            status: string;
        }>()
    ).results;

const liveHash = async () => (await env.CATALOG.head(KEY))?.customMetadata?.hash;

const liveShowName = async () => {
    const object = await env.CATALOG.get(KEY);
    const document = JSON.parse((await object?.text()) ?? '{}') as { shows: Json[] };
    return (document.shows[0]?.definition as Json).name;
};

/** R2 同 D1 最新 ok publish 係同一份 */
const expectInStep = async () => {
    const latest = await latestPublish(env.DB);
    expect(await liveHash()).toBe(latest?.row.hash);
};

/** 第一次 R2 put 停喺度（publishes 行已經寫咗），release 之後先真係寫 */
const heldPut = () => {
    let release = () => undefined as void;
    let enter = () => undefined as void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const reached = new Promise<void>((resolve) => (enter = resolve));
    const bucket = {
        head: (key: string) => env.CATALOG.head(key),
        put: async (...args: Parameters<R2Bucket['put']>) => {
            enter();
            await gate;
            return env.CATALOG.put(...args);
        },
    } as unknown as R2Bucket;
    return { bindings: { ...env, CATALOG: bucket }, reached, release };
};

const settled = <T>(promise: Promise<T>) =>
    promise.then(
        (value) => ({ value, error: undefined }),
        (error: unknown) => ({ value: undefined, error }),
    );

const post = async (path: string, bindings = env) =>
    call(
        path,
        { method: 'POST', headers: { cookie: await loginCookie(), origin: ORIGIN } },
        bindings,
    );

beforeEach(() => seed(3));

describe('insertPublish (AU-018)', () => {
    const row = {
        createdAt: '2026-11-22T00:00:00.000Z',
        createdBy: 'x',
        hash: 'h',
        document: '{}',
        episodeIds: [],
        showCount: 0,
        dramaCount: 0,
        episodeCount: 0,
        rollbackOf: null,
    };

    it('should insert when the latest ok publish is still the base', async () => {
        expect(await insertPublish(env.DB, { ...row, base: null })).toMatchObject({ id: 1 });
        expect(await insertPublish(env.DB, { ...row, base: 1 })).toMatchObject({ id: 2 });
    });

    it('should insert nothing when another publish landed after the base was read', async () => {
        await insertPublish(env.DB, { ...row, base: null });
        expect(await insertPublish(env.DB, { ...row, base: null })).toBeNull();
        expect(await rows()).toHaveLength(1);
    });

    it('should ignore failed rows when matching the base', async () => {
        await insertPublish(env.DB, { ...row, base: null });
        await env.DB.prepare("UPDATE publishes SET status = 'failed' WHERE id = 1").run();
        expect(await insertPublish(env.DB, { ...row, base: null })).toMatchObject({ id: 2 });
    });
});

describe('commitPublish serialisation (AU-018)', () => {
    it('should refuse a document prepared against an older base, writing nothing', async () => {
        await adminPost('/api/publish');
        const before = await liveHash();
        await rename('Stale');
        await expect(commitPublish(env, await validated(), options(null))).rejects.toBeInstanceOf(
            PublishConflictError,
        );
        expect((await rows()).map((r) => r.id)).toEqual([1]);
        expect(await liveHash()).toBe(before);
    });

    it('should let only one of two overlapping publishes land and keep R2 in step with D1', async () => {
        await adminPost('/api/publish');
        await rename('First');
        const held = heldPut();
        const first = settled(commitPublish(held.bindings, await validated(), options(1)));
        await held.reached;
        // 第二個喺第一個寫 R2 之前開始同完成
        await rename('Second');
        const second = await commitPublish(env, await validated(), options(await baseNow()));
        expect(second).toMatchObject({ kind: 'published', publish: { id: 3 } });
        held.release();
        expect((await first).error).toBeInstanceOf(PublishConflictError);
        expect((await rows()).map((r) => r.id)).toEqual([1, 3]);
        expect(await liveShowName()).toBe('Second');
        await expectInStep();
    });

    it('should do the same when nothing was published before (no R2 object yet)', async () => {
        await rename('First');
        const held = heldPut();
        const first = settled(commitPublish(held.bindings, await validated(), options(null)));
        await held.reached;
        await rename('Second');
        await commitPublish(env, await validated(), options(await baseNow()));
        held.release();
        expect((await first).error).toBeInstanceOf(PublishConflictError);
        expect((await rows()).map((r) => r.id)).toEqual([2]);
        expect(await liveShowName()).toBe('Second');
        await expectInStep();
    });
});

describe('POST /api/publish serialisation (AU-018)', () => {
    it('should answer 409 with a clear body to the publish that lost the race', async () => {
        const held = heldPut();
        const first = post('/api/publish', held.bindings);
        await held.reached;
        const second = await post('/api/publish');
        expect(second.status).toBe(200);
        // 第一個未寫到 R2：同內容都唔可以當 unchanged
        expect(await second.json()).not.toHaveProperty('unchanged');
        held.release();
        const lost = await first;
        expect(lost.status).toBe(409);
        const body = (await lost.json()) as Json;
        expect(body).toMatchObject(CONFLICT_BODY);
        expect(body.error).toMatch(/another publish/);
        expect(body).not.toHaveProperty('missing');
        expect((await rows()).map((r) => r.id)).toEqual([2]);
        await expectInStep();
    });

    it('should not report unchanged when the latest row never reached R2 (crashed publish)', async () => {
        await adminPost('/api/publish');
        await rename('Crashed');
        // 模擬 Worker 喺記咗 publishes 之後、寫 R2 之前死咗：有行、R2 仲係舊嗰份
        const { doc, json, episodeIds } = await validated();
        await insertPublish(env.DB, {
            createdAt: '2026-11-22T00:00:00.000Z',
            createdBy: 'x',
            hash: 'crashed-before-r2',
            document: json,
            episodeIds,
            showCount: doc.shows.length,
            dramaCount: doc.dramas.length,
            episodeCount: episodeIds.length,
            rollbackOf: null,
            base: 1,
        });
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ publish: { id: 3 } });
        expect(await liveShowName()).toBe('Crashed');
        await expectInStep();
    });

    it('should still answer unchanged when R2 holds the latest publish', async () => {
        await adminPost('/api/publish');
        const response = await adminPost('/api/publish');
        expect(await response.json()).toMatchObject({ unchanged: true, publish: { id: 1 } });
    });

    it('should not hold anything back after a publish whose R2 write failed', async () => {
        const failing = {
            ...env,
            CATALOG: {
                head: (key: string) => env.CATALOG.head(key),
                put: () => Promise.reject(new Error('R2 down')),
            } as unknown as R2Bucket,
        };
        await expect(commitPublish(failing, await validated(), options(null))).rejects.toThrow(
            'R2 down',
        );
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(200);
        await expectInStep();
    });
});

describe('POST /api/publishes/:id/rollback serialisation (AU-018)', () => {
    const goldenEnabled = async () => {
        const definition = await env.DB.prepare(
            "SELECT definition FROM entries WHERE kind = 'dramas' AND id = 'golden'",
        ).first<string>('definition');
        return (JSON.parse(definition ?? '{}') as Json).enabled;
    };

    it('should answer 409 and put D1 back when a publish lands during the restore', async () => {
        await adminPost('/api/publish');
        await putEntry('dramas', 'golden', { ...drama(3), enabled: false });
        await adminPost('/api/publish');
        const held = heldPut();
        const restore = post('/api/publishes/1/rollback', held.bindings);
        await held.reached;
        await rename('Meanwhile');
        expect((await post('/api/publish')).status).toBe(200);
        held.release();
        const lost = await restore;
        expect(lost.status).toBe(409);
        expect(await lost.json()).toMatchObject(CONFLICT_BODY);
        expect(await goldenEnabled()).toBe(false);
        expect((await rows()).map((r) => r.id)).toEqual([1, 2, 4]);
        await expectInStep();
    });

    it('should still restore when nothing else is publishing', async () => {
        await adminPost('/api/publish');
        await putEntry('dramas', 'golden', { ...drama(3), enabled: false });
        await adminPost('/api/publish');
        const response = await adminPost('/api/publishes/1/rollback');
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ publish: { id: 3, rollbackOf: 1 } });
        await expectInStep();
    });
});
