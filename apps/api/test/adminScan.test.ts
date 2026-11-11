/* POST /api/scan（Phase 3a）：入 admin 自動掃 R2，有變先寫 D1 + finding */
import { env } from 'cloudflare:test';
import { hkToday } from '@903-player/catalog';
import { adminRequest, call, loginCookie } from './helpers';
import { drama, putEntry, seed } from './fixtures';

type Json = Record<string, unknown>;

const FOLDER = '黃金少年';
const TEMPLATE = '{no2} - {arc} - 第{noZh}集[ - {title}].m4a';
const NUMERALS = ['', '一', '二', '三', '四'];

const scannable = (episodes: number): Json => ({
    ...drama(episodes),
    audio: { host: 'r2', folder: FOLDER, file: TEMPLATE },
});

const episodeKey = (folder: string, arc: string, no: number) =>
    `${folder}/${arc}/0${no} - ${arc} - 第${NUMERALS[no]}集.m4a`;

const upload = (keys: readonly string[]) =>
    Promise.all(keys.map((key) => env.AUDIO.put(key, new Uint8Array([0]))));

const scan = async () => {
    const response = await adminRequest('POST', '/api/scan');
    return { status: response.status, body: (await response.json()) as Json };
};

const entry = (id: string) =>
    env.DB.prepare(
        "SELECT definition, updated_at, draft FROM entries WHERE kind = 'dramas' AND id = ?",
    )
        .bind(id)
        .first<{ definition: string; updated_at: string; draft: number }>();

const findingRows = async () =>
    (
        await env.DB.prepare(
            'SELECT kind, drama_id, arc_id, detail FROM scan_findings ORDER BY id',
        ).all()
    ).results;

beforeEach(async () => {
    await seed(3);
    await putEntry('dramas', 'golden', scannable(3));
    await upload([1, 2, 3].map((no) => episodeKey(FOLDER, 'Season 1', no)));
});

describe('POST /api/scan', () => {
    it('should write nothing when R2 matches D1', async () => {
        const before = await entry('golden');
        const { status, body } = await scan();
        expect(status).toBe(200);
        expect(body).toMatchObject({ findings: [], skipped: [] });
        expect(typeof body.scannedAt).toBe('string');
        expect(await entry('golden')).toEqual(before);
        expect(await findingRows()).toEqual([]);
    });

    it('should add new episodes to D1 and record a finding', async () => {
        await upload([episodeKey(FOLDER, 'Season 1', 4)]);
        const { body } = await scan();
        const stored = await entry('golden');
        expect(JSON.parse(stored?.definition ?? '{}')).toEqual(scannable(4));
        expect(stored?.updated_at).not.toBe('2026-11-08T00:00:00Z');
        expect(body.findings).toEqual([
            expect.objectContaining({
                kind: 'newEpisodes',
                dramaId: 'golden',
                arcId: 'season-1',
                detail: { arc: 'Season 1', first: 4, last: 4 },
            }),
        ]);
    });

    it('should add a new arc disabled with an auto id <dramaId>-NN', async () => {
        await upload([episodeKey(FOLDER, 'Season 2', 1)]);
        const { body } = await scan();
        const arcs = JSON.parse((await entry('golden'))?.definition ?? '{}').arcs as Json[];
        expect(arcs[1]).toEqual({
            id: 'golden-02',
            name: 'Season 2',
            addedAt: hkToday(),
            episodes: 1,
            enabled: false,
        });
        expect((body.findings as Json[]).map((f) => [f.kind, f.arcId])).toEqual([
            ['newArc', 'golden-02'],
        ]);
    });

    it('should create a draft drama for a new folder, only once', async () => {
        await upload([episodeKey('新劇', '第一部', 1), episodeKey('新劇', '第一部', 2)]);
        const { body } = await scan();
        const created = await entry('drama-01');
        expect(created?.draft).toBe(1);
        expect(JSON.parse(created?.definition ?? '{}')).toMatchObject({
            name: '新劇',
            enabled: false,
            audio: { host: 'r2', folder: '新劇' },
            arcs: [{ id: 'drama-01-01', name: '第一部', episodes: 2 }],
        });
        expect(body.findings).toEqual([
            expect.objectContaining({
                kind: 'newDrama',
                dramaId: 'drama-01',
                detail: { folder: '新劇', name: '新劇' },
            }),
        ]);
        expect((await scan()).body.findings).toEqual([]);
        expect(await findingRows()).toHaveLength(1);
    });

    it('should not create a drama while another drama folder is missing, and flag it once', async () => {
        await env.AUDIO.delete([1, 2, 3].map((no) => episodeKey(FOLDER, 'Season 1', no)));
        await upload([episodeKey('黃金少年 (新)', 'Season 1', 1)]);
        const { body } = await scan();
        expect(await entry('drama-01')).toBeNull();
        expect(body.findings).toEqual([
            expect.objectContaining({
                kind: 'missingFolder',
                dramaId: 'golden',
                detail: { folder: FOLDER },
            }),
        ]);
        expect((await scan()).body.findings).toEqual([]);
    });

    it('should still create a drama for a new folder unrelated to the missing one (S-800)', async () => {
        await env.AUDIO.delete([1, 2, 3].map((no) => episodeKey(FOLDER, 'Season 1', no)));
        // 改名候選（同一個短篇名）擋住；另一套完全唔同嘅劇照建
        await upload([episodeKey('黃金少年 (新)', 'Season 1', 1), episodeKey('新劇', '第一部', 1)]);
        const { body } = await scan();
        const created = await entry('drama-01');
        expect(JSON.parse(created?.definition ?? '{}')).toMatchObject({
            name: '新劇',
            audio: { folder: '新劇' },
        });
        expect(await entry('drama-02')).toBeNull();
        expect((body.findings as Json[]).map((f) => [f.kind, f.dramaId])).toEqual([
            ['missingFolder', 'golden'],
            ['newDrama', 'drama-01'],
        ]);
    });

    it('should hold back a daily folder sharing dates with a missing daily drama (S-800)', async () => {
        await putEntry('dramas', 'daily', {
            ...drama(1),
            kind: 'daily',
            audio: { host: 'r2', folder: '每日劇', file: '{yyyymmdd}.m4a' },
            arcs: undefined,
            episodes: [{ date: '2026-10-21' }, { date: '2026-10-20' }],
        });
        await upload(['每日劇 v2/20261021.m4a', '另一日播/20261101.m4a']);
        await scan();
        const created = await entry('drama-01');
        expect(JSON.parse(created?.definition ?? '{}')).toMatchObject({ name: '另一日播' });
        expect(await entry('drama-02')).toBeNull();
    });

    it('should skip a drama whose folder has errors, writing nothing for it', async () => {
        await upload([
            episodeKey(FOLDER, 'Season 1', 4).replace('/04', '/05').replace('第四集', '第五集'),
        ]);
        const before = await entry('golden');
        const { body } = await scan();
        expect(body.skipped).toEqual([
            expect.objectContaining({ dramaId: 'golden', folder: FOLDER }),
        ]);
        expect(await entry('golden')).toEqual(before);
    });

    it('should need the same origin', async () => {
        const response = await call('/api/scan', {
            method: 'POST',
            headers: { cookie: await loginCookie() },
        });
        expect(response.status).toBe(403);
    });
});
