/*
 * 排序還原（api 0.12.0，.proj-docs/plans/2026-11-14_plan_publish-change-accuracy.md #6 決定 A）：
 * POST /api/order/:kind/revert、entry 還原拒絕 order、變更摘要 / 發佈記錄嘅 reorder item
 */
import { env } from 'cloudflare:test';
import { ORIGIN, adminGet, adminPost, adminRequest, call } from './helpers';
import { drama, putEntry, seed } from './fixtures';
import { revert } from './revertHelpers';

type Json = Record<string, unknown>;

const json = async (response: Response) => (await response.json()) as Json;

const row = (kind: string, id: string) =>
    env.DB.prepare('SELECT definition, updated_at FROM entries WHERE kind = ? AND id = ?')
        .bind(kind, id)
        .first<{ definition: string; updated_at: string }>();

const definitionOf = async (kind: string, id: string) =>
    JSON.parse((await row(kind, id))?.definition ?? 'null') as Json | null;

const order = (kind: string, ids: string[]) =>
    adminRequest('PUT', `/api/order/${kind}`, { body: { ids } });

const revertOrder = (kind: string) => adminPost(`/api/order/${kind}/revert`);

const itemsOf = (summary: unknown) => (summary as Json).items as Json[];

const REORDER_DRAMAS = { kind: 'reorder', when: 'now', detail: { list: 'dramas' } };

beforeEach(async () => {
    await seed(3);
    await putEntry('dramas', 'alpha', { ...drama(3), name: '阿爾法' });
});

describe('POST /api/order/:kind/revert', () => {
    it('should put the published order back, leave new entries alone and touch only changed rows', async () => {
        await order('dramas', ['golden', 'alpha']);
        expect((await adminPost('/api/publish')).status).toBe(200);
        await putEntry('dramas', 'fresh', { ...drama(3), name: '新劇' });
        await order('dramas', ['fresh', 'alpha', 'golden']);
        const changes = await json(await adminGet('/api/changes'));
        expect(itemsOf(changes.changes)).toContainEqual(REORDER_DRAMAS);
        const alphaBefore = await row('dramas', 'alpha');
        const goldenBefore = await definitionOf('dramas', 'golden');
        const response = await revertOrder('dramas');
        expect(response.status).toBe(200);
        expect(await json(response)).toEqual({ updated: 1 });
        expect(await definitionOf('dramas', 'golden')).toEqual({ ...goldenBefore, order: 1 });
        expect(await row('dramas', 'alpha')).toEqual(alphaBefore);
        expect((await definitionOf('dramas', 'fresh'))?.order).toBe(1);
        const after = await json(await adminGet('/api/changes'));
        // 冇 reorder：新劇自己嘅 item 照出
        expect(itemsOf(after.changes).map((item) => item.kind)).toEqual(['newDrama', 'newArc']);
    });

    it('should remove order when the published entry had none', async () => {
        expect((await adminPost('/api/publish')).status).toBe(200);
        const before = await definitionOf('dramas', 'golden');
        await order('dramas', ['alpha', 'golden']);
        expect(await json(await revertOrder('dramas'))).toEqual({ updated: 2 });
        expect(await definitionOf('dramas', 'golden')).toEqual(before);
        expect(await json(await revertOrder('dramas'))).toEqual({ updated: 0 });
    });

    it('should answer 409 notPublished before the first publish', async () => {
        const response = await revertOrder('shows');
        expect(response.status).toBe(409);
        expect(await json(response)).toMatchObject({ reason: 'notPublished' });
    });

    it('should answer 400 for an unknown kind and guard like PUT /api/order', async () => {
        expect((await revertOrder('films')).status).toBe(400);
        const anonymous = await call('/api/order/dramas/revert', {
            method: 'POST',
            headers: { origin: ORIGIN },
        });
        expect(anonymous.status).toBe(401);
        const crossSite = await adminRequest('POST', '/api/order/dramas/revert', {
            headers: { origin: 'https://evil.example' },
        });
        expect(crossSite.status).toBe(403);
    });
});

describe('order in the other change paths', () => {
    it('should refuse to revert order on a single entry (400)', async () => {
        expect((await adminPost('/api/publish')).status).toBe(200);
        await order('dramas', ['alpha', 'golden']);
        const response = await revert('dramas', 'golden', { items: [{ field: 'order' }] });
        expect(response.status).toBe(400);
    });

    it('should show a published drag as one reorder item in GET /api/publishes', async () => {
        await order('dramas', ['golden', 'alpha']);
        expect((await adminPost('/api/publish')).status).toBe(200);
        await order('dramas', ['alpha', 'golden']);
        expect((await adminPost('/api/publish')).status).toBe(200);
        const body = await json(await adminGet('/api/publishes'));
        const latest = (body.publishes as Json[])[0]?.changes;
        expect(itemsOf(latest)).toEqual([REORDER_DRAMAS]);
    });
});
