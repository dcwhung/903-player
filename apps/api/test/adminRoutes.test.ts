/* Phase 3a admin API：待辦、改 ID、資料夾配對、排序、變更摘要、上下架記錄 */
import { env } from 'cloudflare:test';
import { adminGet, adminPost, adminRequest, call } from './helpers';
import { SHOW, TILE, drama, markDraft, putEntry, seed } from './fixtures';

type Json = Record<string, unknown>;

const FOLDER = '黃金少年';
const TEMPLATE = '{no2} - {arc} - 第{noZh}集[ - {title}].m4a';
const NUMERALS = ['', '一', '二', '三', '四'];

const json = async (response: Response) => (await response.json()) as Json;

const scannable = (episodes: number): Json => ({
    ...drama(episodes),
    audio: { host: 'r2', folder: FOLDER, file: TEMPLATE },
});

const episodeKey = (folder: string, arc: string, no: number) =>
    `${folder}/${arc}/0${no} - ${arc} - 第${NUMERALS[no]}集.m4a`;

const upload = (keys: readonly string[]) =>
    Promise.all(keys.map((key) => env.AUDIO.put(key, new Uint8Array([0]))));

const definitionOf = async (kind: string, id: string) =>
    JSON.parse(
        (await env.DB.prepare('SELECT definition FROM entries WHERE kind = ? AND id = ?')
            .bind(kind, id)
            .first<string>('definition')) ?? 'null',
    ) as Json | null;

const addFinding = (kind: string, dramaId: string, arcId: string | null = null) =>
    env.DB.prepare(
        `INSERT INTO scan_findings (kind, drama_id, arc_id, detail, created_at) VALUES (?, ?, ?, '{}', ?)`,
    )
        .bind(kind, dramaId, arcId, '2026-11-10T00:00:00Z')
        .run();

beforeEach(async () => {
    await seed(3);
    await putEntry('dramas', 'golden', scannable(3));
    await upload([1, 2, 3].map((no) => episodeKey(FOLDER, 'Season 1', no)));
});

describe('GET /api/todos', () => {
    it('should give each cell a state for a new draft drama', async () => {
        await upload([episodeKey('新劇', 'A', 1)]);
        await adminPost('/api/scan');
        const body = await json(await adminGet('/api/todos'));
        expect(body.blocking).toBe(1);
        expect(body.rows).toEqual([
            {
                kind: 'newDrama',
                findingIds: [1],
                dramaId: 'drama-01',
                arcId: null,
                name: '新劇',
                cells: {
                    folder: { state: 'done', target: '/dramas/drama-01#folder' },
                    id: { state: 'must', target: '/dramas/drama-01' },
                    images: { state: 'must', target: '/dramas/drama-01#images' },
                    schedule: { state: 'must', target: '/dramas/drama-01/schedule' },
                    summary: { state: 'optional', target: '/dramas/drama-01' },
                },
            },
        ]);
    });

    it('should mark a new arc: auto id and schedule must, done once fixed', async () => {
        await upload([episodeKey(FOLDER, 'Season 2', 1)]);
        await adminPost('/api/scan');
        const [row] = (await json(await adminGet('/api/todos'))).rows as Json[];
        expect(row).toMatchObject({
            kind: 'newArc',
            arcId: 'golden-02',
            name: '黃金少年 · Season 2',
            cells: {
                folder: { state: 'na' },
                id: { state: 'must' },
                images: { state: 'optional' },
                schedule: { state: 'must', target: '/dramas/golden/schedule#golden-02' },
            },
        });
        const fixed = await definitionOf('dramas', 'golden');
        const arcs = (fixed?.arcs as Json[]).map((arc) =>
            arc.id === 'golden-02'
                ? { ...arc, id: 'season-2', enabled: true, summary: '簡介' }
                : arc,
        );
        await putEntry('dramas', 'golden', { ...fixed, arcs });
        const body = await json(await adminGet('/api/todos'));
        expect(body.blocking).toBe(0);
        expect((body.rows as Json[])[0]?.cells).toMatchObject({
            id: { state: 'done' },
            schedule: { state: 'done' },
            summary: { state: 'done' },
        });
    });

    it('should keep a new arc row after its placeholder id is renamed (C-013)', async () => {
        await upload([episodeKey(FOLDER, 'Season 2', 1)]);
        await adminPost('/api/scan');
        const scanned = await definitionOf('dramas', 'golden');
        const renamed = (scanned?.arcs as Json[]).map((arc) =>
            arc.id === 'golden-02' ? { ...arc, id: 'season-2' } : arc,
        );
        await putEntry('dramas', 'golden', { ...scanned, arcs: renamed });
        const body = await json(await adminGet('/api/todos'));
        expect(body.blocking).toBe(1);
        expect(body.rows).toEqual([
            expect.objectContaining({
                kind: 'newArc',
                arcId: 'season-2',
                cells: expect.objectContaining({
                    id: { state: 'done', target: '/dramas/golden/arcs#season-2' },
                    schedule: { state: 'must', target: '/dramas/golden/schedule#season-2' },
                }),
            }),
        ]);
        // 仲有必須：publish 唔可以 resolve 佢
        expect((await adminPost('/api/publish')).status).toBe(200);
        expect(((await json(await adminGet('/api/todos'))).rows as Json[]).length).toBe(1);
    });

    it('should resolve a renamed new arc once it is scheduled and published (C-013)', async () => {
        await adminPost('/api/publish');
        await upload([episodeKey(FOLDER, 'Season 2', 1)]);
        await adminPost('/api/scan');
        const scanned = await definitionOf('dramas', 'golden');
        const ready = (scanned?.arcs as Json[]).map((arc) =>
            arc.id === 'golden-02' ? { ...arc, id: 'season-2', enabled: true } : arc,
        );
        await putEntry('dramas', 'golden', { ...scanned, arcs: ready });
        expect((await json(await adminGet('/api/todos'))).blocking).toBe(0);
        expect((await adminPost('/api/publish')).status).toBe(200);
        expect((await json(await adminGet('/api/todos'))).rows).toEqual([]);
        const open = await env.DB.prepare(
            'SELECT COUNT(*) AS n FROM scan_findings WHERE resolved_publish_id IS NULL',
        ).first('n');
        expect(open).toBe(0);
    });

    it('should show a missing folder as a must and drop rows of deleted dramas', async () => {
        await addFinding('missingFolder', 'golden');
        await addFinding('newEpisodes', 'gone', 's1');
        const body = await json(await adminGet('/api/todos'));
        expect(
            (body.rows as Json[]).map((r) => [r.kind, r.dramaId, (r.cells as Json).folder]),
        ).toEqual([
            ['missingFolder', 'golden', { state: 'must', target: '/dramas/golden#folder' }],
        ]);
    });

    it('should resolve finished findings on publish and keep blocking ones', async () => {
        await addFinding('newEpisodes', 'golden', 'season-1');
        await addFinding('newArc', 'golden', 'season-1');
        await putEntry('dramas', 'golden', {
            ...scannable(3),
            arcs: [
                {
                    id: 'season-1',
                    name: 'Season 1',
                    addedAt: '2026-10-24',
                    episodes: 3,
                    enabled: false,
                },
            ],
        });
        expect((await adminPost('/api/publish')).status).toBe(200);
        const rows = (await json(await adminGet('/api/todos'))).rows as Json[];
        expect(rows.map((r) => r.kind)).toEqual(['newArc']);
    });
});

describe('POST /api/todos/confirm-id (Phase 3c)', () => {
    const confirm = (body: unknown) => adminRequest('POST', '/api/todos/confirm-id', { body });
    const idCells = async () =>
        ((await json(await adminGet('/api/todos'))).rows as Json[]).map((row) => [
            row.kind,
            row.arcId,
            ((row.cells as Json).id as Json).state,
        ]);

    it('should keep an auto-numbered arc id a must until the admin confirms it', async () => {
        await upload([episodeKey(FOLDER, 'Season 2', 1)]);
        await adminPost('/api/scan');
        expect(await idCells()).toEqual([['newArc', 'golden-02', 'must']]);
        const response = await confirm({ dramaId: 'golden', arcId: 'golden-02' });
        expect(response.status).toBe(200);
        expect(await json(response)).toEqual({ confirmed: 1 });
        expect(await idCells()).toEqual([['newArc', 'golden-02', 'done']]);
    });

    it('should confirm a new drama id (drama-NN) without renaming it', async () => {
        await upload([episodeKey('新劇', 'A', 1)]);
        await adminPost('/api/scan');
        expect(await idCells()).toEqual([['newDrama', null, 'must']]);
        expect(await json(await confirm({ dramaId: 'drama-01' }))).toEqual({ confirmed: 1 });
        expect(await idCells()).toEqual([['newDrama', null, 'done']]);
    });

    it('should be idempotent when nothing matches, and refuse bad bodies or unknown dramas', async () => {
        expect(await json(await confirm({ dramaId: 'golden', arcId: 'season-1' }))).toEqual({
            confirmed: 0,
        });
        expect((await confirm({ arcId: 'x' })).status).toBe(400);
        expect((await confirm({ dramaId: 'golden', arcId: '' })).status).toBe(400);
        expect((await confirm({ dramaId: 'nope' })).status).toBe(404);
    });

    it('should need a same-origin session', async () => {
        const response = await call('/api/todos/confirm-id', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ dramaId: 'golden' }),
        });
        expect(response.ok).toBe(false);
    });
});

describe('POST /api/entries/dramas/:id/rename', () => {
    const rename = (id: string, newId: unknown) =>
        adminRequest('POST', `/api/entries/dramas/${id}/rename`, { body: { newId } });

    it('should rename a never-published drama with its schedules and findings', async () => {
        await putEntry('dramas', 'drama-01', scannable(3));
        await env.DB.prepare(
            "INSERT INTO schedules (drama_id, arc_id, rule, updated_at) VALUES ('drama-01', 'season-1', '{}', 'x')",
        ).run();
        await addFinding('newDrama', 'drama-01');
        const response = await rename('drama-01', 'new-drama');
        expect(response.status).toBe(200);
        expect(await json(response)).toMatchObject({ id: 'new-drama' });
        expect(response.headers.get('etag')).toBeTruthy();
        expect(await definitionOf('dramas', 'drama-01')).toBeNull();
        expect(await definitionOf('dramas', 'new-drama')).toEqual(scannable(3));
        const ids = async (table: string) =>
            (await env.DB.prepare(`SELECT drama_id FROM ${table}`).all()).results.map(
                (r) => r.drama_id,
            );
        expect(await ids('schedules')).toEqual(['new-drama']);
        expect(await ids('scan_findings')).toEqual(['new-drama']);
    });

    it('should move auto-numbered arc ids (<id>-NN) to the new id with their schedules (Phase 3c)', async () => {
        const arcs = [
            { id: 'drama-01-01', name: 'Season 1', episodes: 3 },
            { id: 'drama-01-extra', name: 'Extra', episodes: 1 },
        ];
        await putEntry('dramas', 'drama-01', { ...scannable(3), arcs });
        await env.DB.prepare(
            "INSERT INTO schedules (drama_id, arc_id, rule, updated_at) VALUES ('drama-01', 'drama-01-01', '{}', 'x')",
        ).run();
        await addFinding('newArc', 'drama-01', 'drama-01-01');
        expect((await rename('drama-01', 'lancy')).status).toBe(200);
        expect(((await definitionOf('dramas', 'lancy'))?.arcs as Json[]).map((a) => a.id)).toEqual([
            'lancy-01',
            'drama-01-extra',
        ]);
        const pairs = async (table: string) =>
            (await env.DB.prepare(`SELECT drama_id, arc_id FROM ${table}`).all()).results;
        expect(await pairs('schedules')).toEqual([{ drama_id: 'lancy', arc_id: 'lancy-01' }]);
        expect(await pairs('scan_findings')).toEqual([{ drama_id: 'lancy', arc_id: 'lancy-01' }]);
    });

    it('should rename a drama published only while unlisted (W-707)', async () => {
        await putEntry('dramas', 'drama-01', { ...scannable(3), enabled: false });
        expect((await adminPost('/api/publish')).status).toBe(200);
        expect((await rename('drama-01', 'new-drama')).status).toBe(200);
        expect((await adminPost('/api/publish')).status).toBe(200);
    });

    it('should refuse with 409 once the drama has been published', async () => {
        await adminPost('/api/publish');
        expect((await rename('golden', 'golden-boy')).status).toBe(409);
    });

    it('should refuse an existing id (409), a bad id (400), an unknown drama (404) and a stale If-Match (412)', async () => {
        await putEntry('dramas', 'other', scannable(3));
        expect((await rename('golden', 'other')).status).toBe(409);
        expect((await rename('golden', 'Bad_Id')).status).toBe(400);
        expect((await rename('nope', 'x')).status).toBe(404);
        const stale = await adminRequest('POST', '/api/entries/dramas/golden/rename', {
            body: { newId: 'x' },
            headers: { 'if-match': '"old"' },
        });
        expect(stale.status).toBe(412);
    });
});

describe('R2 folders', () => {
    it('should list top-level folders no drama uses', async () => {
        await upload([episodeKey('新劇', 'A', 1), episodeKey('另一套', 'B', 1)]);
        expect(await json(await adminGet('/api/folders/unmapped'))).toEqual({
            folders: ['另一套', '新劇'],
        });
    });

    it('should pair a folder, rescan the drama and clear its missing-folder finding', async () => {
        await env.AUDIO.delete([1, 2, 3].map((no) => episodeKey(FOLDER, 'Season 1', no)));
        await upload([1, 2, 3, 4].map((no) => episodeKey('黃金少年2', 'Season 1', no)));
        await addFinding('missingFolder', 'golden');
        const response = await adminRequest('POST', '/api/dramas/golden/folder', {
            body: { folder: '黃金少年2' },
        });
        expect(response.status).toBe(200);
        const stored = await definitionOf('dramas', 'golden');
        expect(stored).toMatchObject({ audio: { folder: '黃金少年2' }, arcs: [{ episodes: 4 }] });
        expect((await json(response)).findings).toEqual([
            expect.objectContaining({ kind: 'newEpisodes' }),
        ]);
        const kinds = (await env.DB.prepare('SELECT kind FROM scan_findings').all()).results.map(
            (r) => r.kind,
        );
        expect(kinds).toEqual(['newEpisodes']);
    });

    it('should refuse a folder missing in R2 (422), used by another drama (409) or a bad body (400)', async () => {
        await putEntry('dramas', 'other', {
            ...scannable(3),
            audio: { host: 'r2', folder: '其他', file: TEMPLATE },
        });
        await upload([episodeKey('其他', 'A', 1)]);
        const pair = (folder: unknown) =>
            adminRequest('POST', '/api/dramas/golden/folder', { body: { folder } });
        expect((await pair('冇呢個')).status).toBe(422);
        expect((await pair('其他')).status).toBe(409);
        expect((await pair('')).status).toBe(400);
    });
});

describe('PUT /api/order/:kind', () => {
    const order = (kind: string, ids: unknown) =>
        adminRequest('PUT', `/api/order/${kind}`, { body: { ids } });

    beforeEach(async () => {
        await putEntry('dramas', 'alpha', scannable(3));
        await putEntry('dramas', 'hidden', { ...scannable(3), enabled: false, order: 9 });
        await putEntry('dramas', 'draft', scannable(3));
        await markDraft('dramas', 'draft');
    });

    it('should write order 1..n for the listed entries only, leaving disabled and drafts alone', async () => {
        const response = await order('dramas', ['golden', 'alpha']);
        expect(response.status).toBe(200);
        expect(await json(response)).toEqual({
            ids: ['golden', 'alpha'],
            changed: ['golden', 'alpha'],
        });
        expect((await definitionOf('dramas', 'golden'))?.order).toBe(1);
        expect((await definitionOf('dramas', 'alpha'))?.order).toBe(2);
        expect((await definitionOf('dramas', 'hidden'))?.order).toBe(9);
        expect((await definitionOf('dramas', 'draft'))?.order).toBeUndefined();
        expect((await json(await order('dramas', ['golden', 'alpha']))).changed).toEqual([]);
    });

    it('should keep the definition valid for a later publish', async () => {
        await order('dramas', ['alpha', 'golden']);
        expect((await adminPost('/api/publish')).status).toBe(200);
    });

    it('should refuse ids that are not exactly the listed entries', async () => {
        expect((await order('dramas', ['golden'])).status).toBe(422);
        expect((await order('dramas', ['golden', 'alpha', 'hidden'])).status).toBe(422);
        expect((await order('dramas', ['golden', 'golden'])).status).toBe(422);
        expect((await order('dramas', 'golden')).status).toBe(400);
        expect((await order('films', [])).status).toBe(400);
    });

    it('should order shows too', async () => {
        await putEntry('shows', 'second', SHOW);
        expect((await order('shows', ['second', 'badgirl'])).status).toBe(200);
        expect((await definitionOf('shows', 'second'))?.order).toBe(1);
    });
});

describe('GET /api/changes', () => {
    it('should summarise D1 against the latest publish and validate it', async () => {
        await adminPost('/api/publish');
        await putEntry('dramas', 'golden', scannable(4));
        const body = await json(await adminGet('/api/changes'));
        expect(body.base).toBe(1);
        expect(body.validation).toEqual({ ok: true, episodeCount: 4 });
        expect((body.changes as Json).items).toEqual([
            expect.objectContaining({
                kind: 'newEpisodes',
                detail: { episodes: { first: 4, last: 4 } },
            }),
        ]);
    });

    it('should find no changes right after a publish', async () => {
        await adminPost('/api/publish');
        expect((await json(await adminGet('/api/changes'))).changes).toEqual({
            items: [],
            timeline: [],
        });
    });

    it('should report a validation error without failing, and leave drafts out', async () => {
        await putEntry('dramas', 'drama-01', scannable(3), {});
        await markDraft('dramas', 'drama-01');
        await putEntry('dramas', 'golden', scannable(3), { 'tile.webp': TILE });
        const body = await json(await adminGet('/api/changes'));
        expect(body.base).toBeNull();
        expect(body.validation).toMatchObject({ ok: false });
        const ids = ((body.changes as Json).items as Json[]).map(
            (i) => (i.entry as Json | undefined)?.id,
        );
        expect(ids).not.toContain('drama-01');
    });
});

describe('GET /api/publishes changes', () => {
    it('should attach the changes since the previous publish to each row', async () => {
        await adminPost('/api/publish');
        await putEntry('dramas', 'golden', scannable(4));
        await adminPost('/api/publish');
        await adminPost('/api/publishes/1/rollback?force=1');
        const { publishes } = (await json(await adminGet('/api/publishes'))) as {
            publishes: Json[];
        };
        const kinds = (p: Json | undefined) =>
            ((p?.changes as Json).items as Json[]).map((i) => i.kind);
        expect(kinds(publishes[2])).toEqual(['newShow', 'newDrama', 'newArc']);
        expect(kinds(publishes[1])).toEqual(['newEpisodes']);
        expect(kinds(publishes[0])).toEqual(['rollback', 'unlist']);
        expect(publishes[0]).toMatchObject({ rollbackOf: 1, error: null });
    });
});
