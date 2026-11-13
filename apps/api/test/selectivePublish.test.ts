/*
 * 選擇發佈（api 0.10.0，.proj-docs/plans/2026-11-13_plan_selective-publish.md）：
 * POST /api/publish { selection }、GET /api/todos 嘅 key / publish、GET /api/changes 嘅 appearance / others / ?selection
 */
import { env } from 'cloudflare:test';
import { adminGet, adminPost, adminRequest } from './helpers';
import { SHOW, drama, markDraft, putEntry, seed } from './fixtures';

type Json = Record<string, unknown>;

const ARC_ADDED = '2026-10-24';
const READY_ARC = { id: 'season-2', name: 'Season 2', addedAt: ARC_ADDED, episodes: 2 };
/** 掃描自動 ID（未確認）+ 未排期：兩格必須 */
const INCOMPLETE_ARC = {
    id: 'golden-03',
    name: 'Season 3',
    addedAt: ARC_ADDED,
    episodes: 1,
    enabled: false,
};
const READY_KEY = 'newArc/golden/season-2';
const INCOMPLETE_KEY = 'newArc/golden/golden-03';
const BANNER = { standard: 'aaaaaaaaaaaaaaaa.webp', long: 'bbbbbbbbbbbbbbbb.webp' };

const json = async (response: Response) => (await response.json()) as Json;

const addFinding = (kind: string, dramaId: string, arcId: string | null, detail: Json = {}) =>
    env.DB.prepare(
        `INSERT INTO scan_findings (kind, drama_id, arc_id, detail, created_at) VALUES (?, ?, ?, ?, ?)`,
    )
        .bind(kind, dramaId, arcId, JSON.stringify(detail), '2026-11-10T00:00:00Z')
        .run();

/** golden 加短篇（finding 嘅 arc_id = 掃描派嘅自動 ID） */
const addArcs = async (...arcs: Json[]) => {
    const base = drama(3);
    await putEntry('dramas', 'golden', { ...base, arcs: [...(base.arcs as Json[]), ...arcs] });
};

const addReadyArc = async (arc: Json = READY_ARC) => {
    await addArcs(arc);
    await addFinding('newArc', 'golden', 'golden-02', { arc: 'Season 2' });
};

const addIncompleteArc = async () => {
    await addArcs(READY_ARC, INCOMPLETE_ARC);
    await addFinding('newArc', 'golden', 'golden-02', { arc: 'Season 2' });
    await addFinding('newArc', 'golden', 'golden-03', { arc: 'Season 3' });
};

const publish = (body?: unknown) =>
    body === undefined ? adminPost('/api/publish') : adminRequest('POST', '/api/publish', { body });

const catalog = async (): Promise<Json> =>
    JSON.parse((await (await env.CATALOG.get('catalog/v1/catalog.json'))?.text()) ?? '{}') as Json;

const dramaOf = async (id: string) =>
    ((await catalog()).dramas as Json[]).find((entry) => entry.id === id)?.definition as
        Json | undefined;

const arcNames = async () =>
    ((await dramaOf('golden'))?.arcs as Json[]).map((arc) => arc.name as string);

const todoRows = async () => (await json(await adminGet('/api/todos'))).rows as Json[];

const putText = (name: string) =>
    adminRequest('PUT', '/api/branding/text', { body: { name, description: '節目重溫' } });

/** banner 直接寫 D1（PUT /api/banner 驗尺寸，呢度只關心 publish） */
const putBanner = async () => {
    for (const name of Object.values(BANNER))
        await env.DB.prepare(
            'INSERT OR IGNORE INTO assets (hash, content_type, bytes, created_at) VALUES (?, ?, ?, ?)',
        )
            .bind(name.split('.')[0], 'image/webp', 1, '2026-11-08T00:00:00Z')
            .run();
    await env.DB.prepare('INSERT INTO banner (id, standard, long, updated_at) VALUES (1, ?, ?, ?)')
        .bind(BANNER.standard, BANNER.long, '2026-11-08T00:00:00Z')
        .run();
};

beforeEach(() => seed(3));

describe('GET /api/todos key / publish', () => {
    it('should give each row a stable key and whether it can be picked', async () => {
        await addIncompleteArc();
        await addFinding('newEpisodes', 'golden', 'season-1');
        await putEntry('dramas', 'drama-01', drama(1));
        await markDraft('dramas', 'drama-01');
        await addFinding('newDrama', 'drama-01', null);
        const rows = (await todoRows()).map((row) => [row.key, row.publish]);
        expect(rows).toEqual([
            [READY_KEY, 'selectable'],
            [INCOMPLETE_KEY, 'incomplete'],
            ['newEpisodes/golden/season-1', 'always'],
            ['newDrama/drama-01', 'incomplete'],
        ]);
    });
});

describe('POST /api/publish selection — content', () => {
    beforeEach(async () => {
        expect((await publish()).status).toBe(200);
    });

    it('should publish only the selected arc, drop incomplete ones and resolve only what went out', async () => {
        await addIncompleteArc();
        const response = await publish({ selection: { content: [READY_KEY, INCOMPLETE_KEY] } });
        expect(response.status).toBe(200);
        expect((await json(response)).selection).toEqual({
            content: [READY_KEY],
            skipped: [{ key: INCOMPLETE_KEY, reason: 'incomplete' }],
        });
        expect(await arcNames()).toEqual(['Season 1', 'Season 2']);
        expect((await todoRows()).map((row) => row.key)).toEqual([INCOMPLETE_KEY]);
    });

    it('should leave an unselected arc out, keep its finding open and answer unchanged', async () => {
        await addReadyArc();
        const body = await json(await publish({ selection: { content: [] } }));
        expect(body.unchanged).toBe(true);
        expect(await arcNames()).toEqual(['Season 1']);
        expect((await todoRows()).map((row) => row.key)).toEqual([READY_KEY]);
    });

    it('should keep the last published version of an unselected arc (no 409 for locked IDs)', async () => {
        // 未確認自動 ID 但上咗架：舊行為照發佈（鎖咗 ID），finding 因為必須而留低
        await addArcs({ ...READY_ARC, id: 'golden-02' });
        await addFinding('newArc', 'golden', 'golden-02', { arc: 'Season 2' });
        expect((await publish()).status).toBe(200);
        await addArcs({ ...READY_ARC, id: 'golden-02', summary: '改咗' });
        const response = await publish({ selection: { content: [] } });
        expect(response.status).toBe(200);
        expect((await json(response)).unchanged).toBe(true);
        const arc = ((await dramaOf('golden'))?.arcs as Json[])[1];
        expect(arc).toEqual({ ...READY_ARC, id: 'golden-02' });
    });

    it('should leave an unselected new drama out and add it once selected', async () => {
        await putEntry('dramas', 'fresh', { ...drama(2), name: '新劇' });
        await addFinding('newDrama', 'fresh', null);
        await publish({ selection: { content: [] } });
        expect(await dramaOf('fresh')).toBeUndefined();
        await publish({ selection: { content: ['newDrama/fresh'] } });
        expect((await dramaOf('fresh'))?.name).toBe('新劇');
        expect(await todoRows()).toEqual([]);
    });

    it('should still publish other saved changes and always-rows with a selection', async () => {
        await putEntry('shows', 'badgirl', { ...SHOW, name: '新名' });
        await putEntry('dramas', 'golden', drama(4));
        await addFinding('newEpisodes', 'golden', 'season-1');
        await publish({ selection: {} });
        const shows = (await catalog()).shows as Json[];
        expect((shows[0]?.definition as Json).name).toBe('新名');
        expect(((await dramaOf('golden'))?.arcs as Json[])[0]?.episodes).toBe(4);
        expect(await todoRows()).toEqual([]);
    });

    it('should keep new-episodes rows of an arc that was left out open', async () => {
        await addReadyArc();
        await addFinding('newEpisodes', 'golden', 'season-2');
        await publish({ selection: { content: [] } });
        expect((await todoRows()).map((row) => row.key)).toEqual([
            READY_KEY,
            'newEpisodes/golden/season-2',
        ]);
    });

    it('should publish everything without a selection (old behaviour)', async () => {
        await addIncompleteArc();
        expect((await publish()).status).toBe(200);
        expect(await arcNames()).toEqual(['Season 1', 'Season 2', 'Season 3']);
    });

    it('should answer 422 for unknown keys and write nothing', async () => {
        const response = await publish({ selection: { content: ['newArc/golden/nope'] } });
        expect(response.status).toBe(422);
        expect(await json(response)).toEqual({
            error: 'unknown selection keys',
            keys: ['newArc/golden/nope'],
        });
        const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM publishes').first('n');
        expect(count).toBe(1);
    });

    it('should answer 400 for a malformed body or selection', async () => {
        const bodies: unknown[] = [
            'not json',
            [],
            { selection: [] },
            { selection: { content: 'x' } },
            { selection: { content: [1] } },
            { selection: { branding: { icon: 'yes' } } },
            { selection: { banner: 1 } },
            { selection: { other: true } },
        ];
        for (const body of bodies) expect((await publish(body)).status).toBe(400);
    });
});

describe('POST /api/publish selection — appearance', () => {
    it('should keep unselected branding / banner at the last published value (none at first)', async () => {
        await putText('903 Player');
        await putBanner();
        const first = await json(await publish({ selection: {} }));
        expect(first.publish).toMatchObject({ deploy: 'none' });
        expect((await catalog()).branding).toBeUndefined();
        expect((await catalog()).banner).toBeUndefined();
        const second = await json(await publish({ selection: { branding: { text: true } } }));
        // 冇部署 secret：branding 改咗 = skipped（有觸發）
        expect(second.publish).toMatchObject({ deploy: 'skipped' });
        expect((await catalog()).branding).toEqual({
            text: { name: '903 Player', description: '節目重溫' },
        });
        await putText('新名');
        await publish({ selection: { banner: true } });
        const doc = await catalog();
        expect((doc.branding as Json).text).toMatchObject({ name: '903 Player' });
        expect(Object.keys(doc.banner as Json)).toEqual(['standard', 'long']);
    });
});

describe('GET /api/changes selection data', () => {
    beforeEach(async () => {
        await publish();
    });

    it('should flag each appearance part and list other changes without new content', async () => {
        await putText('903 Player');
        await addReadyArc();
        await putEntry('shows', 'badgirl', { ...SHOW, name: '新名' });
        const body = await json(await adminGet('/api/changes'));
        expect(body.appearance).toEqual({ icon: false, text: true, banner: false });
        const kinds = (summary: unknown) => ((summary as Json).items as Json[]).map((i) => i.kind);
        expect(kinds(body.changes)).toEqual(expect.arrayContaining(['newArc', 'edit']));
        expect(kinds(body.others)).toEqual(['edit']);
    });

    it('should follow ?selection for changes, validation and unchanged', async () => {
        await addReadyArc();
        const query = (selection: unknown) =>
            adminGet(`/api/changes?selection=${encodeURIComponent(JSON.stringify(selection))}`);
        const none = await json(await query({ content: [] }));
        expect(none).toMatchObject({ unchanged: true, validation: { ok: true } });
        expect((none.changes as Json).items).toEqual([]);
        const picked = await json(await query({ content: [READY_KEY] }));
        expect(picked).toMatchObject({
            unchanged: false,
            selection: { content: [READY_KEY], skipped: [] },
        });
        expect(((picked.changes as Json).items as Json[]).map((i) => i.kind)).toEqual(['newArc']);
        expect((await adminGet('/api/changes?selection=oops')).status).toBe(400);
        expect((await query({ content: ['newDrama/nope'] })).status).toBe(422);
    });
});
