import { env } from 'cloudflare:test';
import { updateEntryStatement, upsertScheduleStatement } from '../src/catalog/store';
import { adminGet, adminRequest } from './helpers';
import { drama, putEntry, seed } from './fixtures';

type Json = Record<string, unknown>;

const PATH = '/api/dramas/golden/arcs/season-1/schedule';
const WEEKLY = { kind: 'periodic', start: '2026-11-01', perRelease: 2, every: { days: 7 } };

const etag = async (): Promise<string> =>
    (await adminGet('/api/entries/dramas/golden')).headers.get('etag') ?? '';

const definition = async (): Promise<Json> =>
    ((await (await adminGet('/api/entries/dramas/golden')).json()) as { definition: Json })
        .definition;

const arcOf = async (): Promise<Json> => ((await definition()).arcs as Json[])[0] ?? {};

const putSchedule = async (rule: unknown, ifMatch?: string) =>
    adminRequest('PUT', PATH, {
        body: { rule },
        headers: { 'if-match': ifMatch ?? (await etag()) },
    });

const scheduleCount = () => env.DB.prepare('SELECT COUNT(*) AS n FROM schedules').first('n');

beforeEach(() => seed(6));

describe('PUT /api/dramas/:id/arcs/:arcId/schedule', () => {
    it('should expand the rule into the arc and store both atomically', async () => {
        const before = await etag();
        const response = await putSchedule(WEEKLY, before);
        expect(response.status).toBe(200);
        expect(response.headers.get('etag')).not.toBe(before);
        expect(await response.json()).toMatchObject({
            rule: WEEKLY,
            expanded: { addedAt: '2026-11-01', episodeDates: { 3: '2026-11-08', 5: '2026-11-15' } },
        });
        expect(await arcOf()).toEqual({
            id: 'season-1',
            name: 'Season 1',
            addedAt: '2026-11-01',
            episodes: 6,
            episodeDates: { 3: '2026-11-08', 5: '2026-11-15' },
        });
        expect(await scheduleCount()).toBe(1);
    });

    it('should drop old episodeDates / episodeRemovedAt the new rule does not produce', async () => {
        await putSchedule({ ...WEEKLY, removeAfterDays: 60 });
        await putSchedule({ ...WEEKLY, perRelease: 10 });
        const arc = await arcOf();
        expect(arc).not.toHaveProperty('episodeDates');
        expect(arc).not.toHaveProperty('episodeRemovedAt');
    });

    it('should answer 412 and write nothing for a stale If-Match', async () => {
        const response = await putSchedule(WEEKLY, '"stale"');
        expect(response.status).toBe(412);
        expect(await arcOf()).toEqual((drama(6).arcs as Json[])[0]);
        expect(await scheduleCount()).toBe(0);
    });

    it('should answer 422 for a malformed rule, an unknown count or a definition the validator rejects', async () => {
        expect((await putSchedule({ kind: 'monthly' })).status).toBe(422);
        const upcoming = drama(1);
        (upcoming.arcs as Json[])[0] = { id: 'season-1', name: 'Season 1', addedAt: '2026-12-01' };
        await putEntry('dramas', 'golden', upcoming);
        expect((await putSchedule(WEEKLY)).status).toBe(422);
        await putEntry('dramas', 'golden', { ...drama(6), removedAt: '2026-11-20' });
        const late = await putSchedule({ ...WEEKLY, removeAfterDays: 30 });
        expect(late.status).toBe(422);
        expect(JSON.stringify(await late.json())).toContain('removedAt');
        expect(await scheduleCount()).toBe(0);
    });

    it('should answer 422 (not 500) for a huge every.days or removeAfterDays (W-704)', async () => {
        expect((await putSchedule({ ...WEEKLY, every: { days: 1e8 } })).status).toBe(422);
        expect((await putSchedule({ ...WEEKLY, removeAfterDays: 1e9 })).status).toBe(422);
        expect(await scheduleCount()).toBe(0);
    });

    it('should answer 404 for an unknown drama or arc and 422 for a daily drama', async () => {
        const unknownArc = await adminRequest('PUT', '/api/dramas/golden/arcs/nope/schedule', {
            body: { rule: WEEKLY },
            headers: { 'if-match': await etag() },
        });
        expect(unknownArc.status).toBe(404);
        const unknownDrama = await adminRequest('PUT', '/api/dramas/nope/arcs/season-1/schedule', {
            body: { rule: WEEKLY },
            headers: { 'if-match': '"x"' },
        });
        expect(unknownDrama.status).toBe(404);
        await putEntry('dramas', 'golden', {
            ...drama(1),
            kind: 'daily',
            arcs: undefined,
            audio: { host: 'r2', folder: 'x', file: '{yyyymmdd}.m4a' },
            episodes: [{ date: '2026-10-01' }],
        });
        expect((await putSchedule(WEEKLY)).status).toBe(422);
    });
});

describe('schedule write atomicity', () => {
    it('should not store the rule when the entry update loses the optimistic lock', async () => {
        const row = { kind: 'dramas' as const, id: 'golden', definition: '{}', images: '{}' };
        const updatedAt = '2026-11-10T00:00:00.000Z';
        await env.DB.batch([
            updateEntryStatement(env.DB, row, { expected: 'stale', updatedAt }),
            upsertScheduleStatement(env.DB, {
                dramaId: 'golden',
                arcId: 'season-1',
                rule: '{}',
                updatedAt,
            }),
        ]);
        expect(await scheduleCount()).toBe(0);
    });
});

describe('schedule write race (W-703)', () => {
    it('should not store the loser rule when two writers use the same If-Match in the same millisecond', async () => {
        const old = await env.DB.prepare(
            "SELECT updated_at FROM entries WHERE kind = 'dramas' AND id = 'golden'",
        ).first<string>('updated_at');
        const updatedAt = '2026-11-10T00:00:00.000Z';
        const write = (rule: string) => {
            const row = { kind: 'dramas' as const, id: 'golden', definition: rule, images: '{}' };
            return env.DB.batch([
                updateEntryStatement(env.DB, row, { expected: old ?? '', updatedAt }),
                upsertScheduleStatement(env.DB, {
                    dramaId: 'golden',
                    arcId: 'season-1',
                    rule,
                    updatedAt,
                }),
            ]);
        };
        const [winner] = await write('{"winner":true}');
        const [loser] = await write('{"loser":true}');
        expect(winner?.meta.changes).toBe(1);
        expect(loser?.meta.changes).toBe(0);
        const rule = await env.DB.prepare('SELECT rule FROM schedules').first<string>('rule');
        expect(rule).toBe('{"winner":true}');
    });
});

describe('GET / preview / DELETE schedule', () => {
    it('should answer 404 before a rule is saved, then return the rule and its expansion', async () => {
        expect((await adminGet(PATH)).status).toBe(404);
        await putSchedule(WEEKLY);
        const response = await adminGet(PATH);
        expect(await response.json()).toMatchObject({
            rule: WEEKLY,
            expanded: { addedAt: '2026-11-01', episodeDates: { 3: '2026-11-08', 5: '2026-11-15' } },
        });
    });

    it('should preview an expansion without writing anything', async () => {
        const before = await definition();
        const response = await adminRequest('POST', `${PATH}/preview`, { body: { rule: WEEKLY } });
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
            expanded: { addedAt: '2026-11-01', episodeDates: { 3: '2026-11-08', 5: '2026-11-15' } },
        });
        expect(await definition()).toEqual(before);
        expect(await scheduleCount()).toBe(0);
        const bad = await adminRequest('POST', `${PATH}/preview`, {
            body: { rule: { kind: 'x' } },
        });
        expect(bad.status).toBe(422);
    });

    it('should delete only the rule and keep the dates in the definition', async () => {
        await putSchedule(WEEKLY);
        const arc = await arcOf();
        expect((await adminRequest('DELETE', PATH)).status).toBe(204);
        expect(await scheduleCount()).toBe(0);
        expect(await arcOf()).toEqual(arc);
        expect((await adminRequest('DELETE', PATH)).status).toBe(404);
    });
});
