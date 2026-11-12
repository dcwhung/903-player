import { env } from 'cloudflare:test';
import { updateEntryStatement, upsertScheduleStatement } from '../src/catalog/store';
import { adminGet, adminRequest } from './helpers';
import { DISC, TILE, drama, putEntry, seed } from './fixtures';

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

describe('invalid drama id (S-787)', () => {
    it('should answer 400 like /entries for every schedule method', async () => {
        const path = '/api/dramas/Bad_Id/arcs/season-1/schedule';
        const responses = await Promise.all([
            adminGet(path),
            adminRequest('POST', `${path}/preview`, { body: { rule: {} } }),
            adminRequest('PUT', path, { body: { rule: {} }, headers: { 'if-match': '"x"' } }),
            adminRequest('DELETE', path),
        ]);
        expect(responses.map((r) => r.status)).toEqual([400, 400, 400, 400]);
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

describe('PUT schedule with enable: true (S-803)', () => {
    const unlisted = async () => {
        const definition = drama(6);
        const [arc] = definition.arcs as Json[];
        await putEntry('dramas', 'golden', { ...definition, arcs: [{ ...arc, enabled: false }] });
    };
    const put = async (body: Json) =>
        adminRequest('PUT', PATH, { body, headers: { 'if-match': await etag() } });

    it('should list the arc in the same write as the schedule', async () => {
        await unlisted();
        const response = await put({ rule: WEEKLY, enable: true });
        expect(response.status).toBe(200);
        expect(Object.keys((await response.json()) as Json).sort()).toEqual([
            'expanded',
            'rule',
            'updatedAt',
            'warnings',
        ]);
        expect(await arcOf()).toMatchObject({ enabled: true, addedAt: '2026-11-01' });
        expect(await scheduleCount()).toBe(1);
    });

    it('should leave enabled alone without enable (old clients) or with enable: false', async () => {
        await unlisted();
        expect((await put({ rule: WEEKLY })).status).toBe(200);
        expect((await arcOf()).enabled).toBe(false);
        expect((await put({ rule: WEEKLY, enable: false })).status).toBe(200);
        expect((await arcOf()).enabled).toBe(false);
    });

    it('should answer 400 for a non-boolean enable and write nothing', async () => {
        await unlisted();
        expect((await put({ rule: WEEKLY, enable: 'yes' })).status).toBe(400);
        expect(await scheduleCount()).toBe(0);
        expect((await arcOf()).enabled).toBe(false);
    });

    it('should write neither the schedule nor enabled on a stale If-Match', async () => {
        await unlisted();
        const response = await adminRequest('PUT', PATH, {
            body: { rule: WEEKLY, enable: true },
            headers: { 'if-match': '"stale"' },
        });
        expect(response.status).toBe(412);
        expect(await scheduleCount()).toBe(0);
        expect((await arcOf()).enabled).toBe(false);
    });
});

describe('arc id change with a schedule (S-804)', () => {
    const putDefinition = async (definition: Json) =>
        adminRequest('PUT', '/api/entries/dramas/golden', {
            body: { definition, images: { 'tile.webp': TILE, 'disc.webp': DISC } },
            headers: { 'if-match': await etag() },
        });
    const renamedArc = (current: Json, id: string): Json => ({
        ...current,
        arcs: (current.arcs as Json[]).map((arc) => ({ ...arc, id })),
    });

    it('should refuse with 409 to drop the id of a scheduled arc, writing nothing', async () => {
        expect((await putSchedule(WEEKLY)).status).toBe(200);
        const before = await definition();
        const response = await putDefinition(renamedArc(before, 'season-one'));
        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
            error: 'arc season-1 has a schedule; delete it before changing the arc id',
            arcId: 'season-1',
            reason: 'arcScheduled',
        });
        expect(await definition()).toEqual(before);
    });

    it('should allow changing the id of an arc without a schedule', async () => {
        const response = await putDefinition(renamedArc(await definition(), 'season-one'));
        expect(response.status).toBe(200);
        expect(((await definition()).arcs as Json[])[0]?.id).toBe('season-one');
    });

    it('should not block on a schedule left behind for an arc id that is already gone', async () => {
        await env.DB.prepare(
            "INSERT INTO schedules (drama_id, arc_id, rule, updated_at) VALUES ('golden', 'old-arc', '{}', 'x')",
        ).run();
        const response = await putDefinition({ ...(await definition()), name: '改名' });
        expect(response.status).toBe(200);
    });
});

describe('schedule unlisting (mockup admin-schedule-unlist ⑧ ⑨)', () => {
    /** 全部已上架（24/10 一次過）：照抄已上架批次，只設下架 */
    const LISTED = { kind: 'dates', batches: [{ from: 1, date: '2026-10-24' }] };

    it('should write the removals of an unlist-only rule and keep the listing as it is', async () => {
        const rule = { ...LISTED, unlist: { kind: 'date', date: '2026-12-31' } };
        const response = await putSchedule(rule);
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ rule });
        expect(await arcOf()).toEqual({
            id: 'season-1',
            name: 'Season 1',
            addedAt: '2026-10-24',
            episodes: 6,
            episodeRemovedAt: { '1-6': '2026-12-31' },
        });
        expect(await (await adminGet(PATH)).json()).toMatchObject({ rule });
    });

    it('should unlist periodically from episode 1 and keep listed batches before a periodic rule', async () => {
        const rule = {
            ...WEEKLY,
            start: '2026-11-08',
            from: 3,
            listed: [{ from: 1, date: '2026-10-24' }],
            unlist: { kind: 'periodic', start: '2026-12-01', perRelease: 4, every: { days: 7 } },
        };
        expect((await putSchedule(rule)).status).toBe(200);
        expect(await arcOf()).toMatchObject({
            addedAt: '2026-10-24',
            episodeDates: { 3: '2026-11-08', 5: '2026-11-15' },
            episodeRemovedAt: { '1-4': '2026-12-01', '5-6': '2026-12-08' },
        });
    });

    it('should keep reading a stored legacy removeAfterDays rule', async () => {
        await env.DB.prepare(
            "INSERT INTO schedules (drama_id, arc_id, rule, updated_at) VALUES ('golden', 'season-1', ?, 'x')",
        )
            .bind(JSON.stringify({ ...WEEKLY, removeAfterDays: 30 }))
            .run();
        expect(await (await adminGet(PATH)).json()).toMatchObject({
            rule: { removeAfterDays: 30 },
            expanded: { episodeRemovedAt: { '1-2': '2026-12-01', '3-4': '2026-12-08' } },
        });
    });

    it('should answer 422 with the episode when an unlist date is not after its listing date', async () => {
        const rule = { ...WEEKLY, unlist: { kind: 'date', date: '2026-11-08' } };
        const details =
            'episode 3 unlist date 2026-11-08 must be later than its listing date 2026-11-08';
        const preview = await adminRequest('POST', `${PATH}/preview`, { body: { rule } });
        expect(preview.status).toBe(422);
        expect(await preview.json()).toEqual({ error: 'invalid schedule', details });
        const put = await putSchedule(rule);
        expect(put.status).toBe(422);
        expect(await put.json()).toEqual({ error: 'invalid schedule', details });
        expect(await scheduleCount()).toBe(0);
    });

    it('should preview the removals without writing anything', async () => {
        const rule = { ...LISTED, unlist: { kind: 'afterDays', days: 60 } };
        const response = await adminRequest('POST', `${PATH}/preview`, { body: { rule } });
        expect(await response.json()).toMatchObject({
            expanded: { addedAt: '2026-10-24', episodeRemovedAt: { '1-6': '2026-12-23' } },
        });
        expect(await scheduleCount()).toBe(0);
    });

    it('should count an unlist-only schedule as scheduled in the todos', async () => {
        await env.DB.prepare(
            "INSERT INTO scan_findings (kind, drama_id, arc_id, detail, created_at) VALUES ('newEpisodes', 'golden', 'season-1', '{}', 'x')",
        ).run();
        const cells = async () =>
            ((await (await adminGet('/api/todos')).json()) as { rows: Json[] }).rows[0]?.cells;
        expect(await cells()).toMatchObject({ schedule: { state: 'optional' } });
        await putSchedule({ ...LISTED, unlist: { kind: 'date', date: '2026-12-31' } });
        expect(await cells()).toMatchObject({ schedule: { state: 'done' } });
    });
});
