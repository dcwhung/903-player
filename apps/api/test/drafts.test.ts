/* entries.draft（Phase 3a）：掃描自動建嘅劇 PUT 寬鬆驗證、完整驗證過咗自動清、publish 唔包 */
import { env } from 'cloudflare:test';
import { adminGet, adminPost, adminRequest } from './helpers';
import { DISC, TILE, drama, markDraft, putEntry, seed } from './fixtures';

type Json = Record<string, unknown>;

const IMAGES = { 'tile.webp': TILE, 'disc.webp': DISC };

/** 掃描建出嚟嘅樣：未有圖、placeholder ID、未上架 */
const draftDrama = (episodes = 2): Json => ({
    ...drama(episodes),
    enabled: false,
    arcs: [{ id: 'arc-01', name: 'Season 1', addedAt: '2026-11-10', episodes }],
});

const etagOf = async (id: string) =>
    (await adminGet(`/api/entries/dramas/${id}`)).headers.get('etag') ?? '';

const put = async (id: string, definition: Json, images: Json) =>
    adminRequest('PUT', `/api/entries/dramas/${id}`, {
        body: { definition, images },
        headers: { 'if-match': await etagOf(id) },
    });

const draftFlag = (id: string) =>
    env.DB.prepare("SELECT draft FROM entries WHERE kind = 'dramas' AND id = ?")
        .bind(id)
        .first<number>('draft');

beforeEach(async () => {
    await seed(3);
    await putEntry('dramas', 'drama-01', draftDrama(), {});
    await markDraft('dramas', 'drama-01');
});

describe('draft entries', () => {
    it('should accept a draft without uploaded images and keep it a draft', async () => {
        const response = await put('drama-01', draftDrama(3), {});
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ draft: true });
        expect(await draftFlag('drama-01')).toBe(1);
    });

    it('should still reject a draft that breaks other rules', async () => {
        const response = await put('drama-01', { ...draftDrama(), kind: 'weekly' }, {});
        expect(response.status).toBe(422);
    });

    it('should still check uploaded image names on a draft', async () => {
        const response = await put('drama-01', draftDrama(), { 'tile.webp': 'nope.webp' });
        expect(response.status).toBe(422);
    });

    it('should clear the draft flag once a PUT passes full validation', async () => {
        const response = await put('drama-01', draftDrama(), IMAGES);
        expect(await response.json()).toMatchObject({ draft: false });
        expect(await draftFlag('drama-01')).toBe(0);
        const listed = (await (await adminGet('/api/entries')).json()) as { entries: Json[] };
        expect(listed.entries.find((e) => e.id === 'drama-01')).toMatchObject({ draft: false });
    });

    it('should keep the full validation for entries that are not drafts', async () => {
        const response = await put('golden', drama(3), {});
        expect(response.status).toBe(422);
    });

    it('should leave drafts out of a publish', async () => {
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(200);
        const doc = JSON.parse(
            (await env.DB.prepare('SELECT document FROM publishes').first<string>('document')) ??
                '{}',
        ) as { dramas: Json[] };
        expect(doc.dramas.map((d) => d.id)).toEqual(['golden']);
    });

    it('should let a draft be deleted (never published)', async () => {
        await adminPost('/api/publish');
        const response = await adminRequest('DELETE', '/api/entries/dramas/drama-01');
        expect(response.status).toBe(204);
    });

    it('should let a schedule be saved on a draft without images', async () => {
        const response = await adminRequest('PUT', '/api/dramas/drama-01/arcs/arc-01/schedule', {
            body: { rule: { kind: 'dates', batches: [{ from: 1, date: '2026-12-01' }] } },
            headers: { 'if-match': await etagOf('drama-01') },
        });
        expect(response.status).toBe(200);
        expect(await draftFlag('drama-01')).toBe(1);
    });
});
