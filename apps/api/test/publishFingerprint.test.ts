/*
 * 確認發佈頁版本守衛（AU-021）：GET /api/changes 回 fingerprint（照而家 D1 會發佈嘅內容），
 * POST /api/publish 帶返佢；中間有人儲存咗 → 412、乜都唔寫。冇帶 = 舊行為
 */
import { env } from 'cloudflare:test';
import { adminGet, adminPost, adminRequest } from './helpers';
import { SHOW, putEntry, seed } from './fixtures';

type Json = Record<string, unknown>;

const json = async (response: Response) => (await response.json()) as Json;

const publish = (body: unknown) => adminRequest('POST', '/api/publish', { body });

const changes = (selection?: unknown) =>
    adminGet(
        selection === undefined
            ? '/api/changes'
            : `/api/changes?selection=${encodeURIComponent(JSON.stringify(selection))}`,
    );

const fingerprintOf = async (selection?: unknown) =>
    (await json(await changes(selection))).fingerprint as string;

const publishCount = () => env.DB.prepare('SELECT COUNT(*) AS n FROM publishes').first('n');

const liveShowName = async () => {
    const object = await env.CATALOG.get('catalog/v1/catalog.json');
    const document = JSON.parse((await object?.text()) ?? '{}') as { shows: Json[] };
    return (document.shows[0]?.definition as Json).name;
};

const rename = (name: string) => putEntry('shows', 'badgirl', { ...SHOW, name });

const SELECTION = { content: [] };

beforeEach(async () => {
    await seed(3);
    expect((await adminPost('/api/publish')).status).toBe(200);
});

describe('GET /api/changes fingerprint', () => {
    it('should stay the same while nothing is saved and change when an entry is saved', async () => {
        await rename('甲');
        const first = await fingerprintOf(SELECTION);
        expect(first).toMatch(/^1\.[0-9a-f]{64}$/);
        expect(await fingerprintOf(SELECTION)).toBe(first);

        await rename('乙');
        expect(await fingerprintOf(SELECTION)).not.toBe(first);
    });

    it('should change when a new publish becomes the base', async () => {
        await rename('甲');
        const first = await fingerprintOf();
        expect((await adminPost('/api/publish')).status).toBe(200);
        expect(await fingerprintOf()).not.toBe(first);
    });

    it('should be left out when the document does not validate', async () => {
        await putEntry('shows', 'badgirl', { ...SHOW, tile: 'missing.webp' });
        const body = await json(await changes());
        expect(body.validation).toMatchObject({ ok: false });
        expect(body.fingerprint).toBeUndefined();
    });
});

describe('POST /api/publish fingerprint', () => {
    it('should publish when the fingerprint matches what the changes summary showed', async () => {
        await rename('甲');
        const fingerprint = await fingerprintOf(SELECTION);

        const response = await publish({ selection: SELECTION, fingerprint });

        expect(response.status).toBe(200);
        expect(await liveShowName()).toBe('甲');
        expect(await publishCount()).toBe(2);
    });

    it('should answer 412 and write nothing when an entry was saved after the summary', async () => {
        await rename('甲');
        const fingerprint = await fingerprintOf(SELECTION);
        await rename('乙');

        const response = await publish({ selection: SELECTION, fingerprint });

        expect(response.status).toBe(412);
        expect(await json(response)).toEqual({ error: 'stale publish confirmation' });
        expect(await publishCount()).toBe(1);
        expect(await liveShowName()).toBe(SHOW.name);
    });

    it('should answer 412 with ?force=1 too (force only skips the episode ID guard)', async () => {
        await rename('甲');
        const fingerprint = await fingerprintOf(SELECTION);
        await rename('乙');

        const response = await adminRequest('POST', '/api/publish?force=1', {
            body: { selection: SELECTION, fingerprint },
        });

        expect(response.status).toBe(412);
        expect(await publishCount()).toBe(1);
    });

    it('should check the fingerprint without a selection as well', async () => {
        await rename('甲');
        const fingerprint = await fingerprintOf();
        expect((await publish({ fingerprint: `${fingerprint}0` })).status).toBe(412);
        expect((await publish({ fingerprint })).status).toBe(200);
    });

    it('should publish whatever is saved now when no fingerprint is sent (old behaviour)', async () => {
        await rename('甲');
        await fingerprintOf(SELECTION);
        await rename('乙');

        expect((await publish({ selection: SELECTION })).status).toBe(200);
        expect(await liveShowName()).toBe('乙');
        await rename('丙');
        expect((await adminPost('/api/publish')).status).toBe(200);
        expect(await liveShowName()).toBe('丙');
    });

    it('should answer 400 for a fingerprint that is not a string', async () => {
        const response = await publish({ selection: SELECTION, fingerprint: 1 });
        expect(response.status).toBe(400);
        expect(await publishCount()).toBe(1);
    });
});
