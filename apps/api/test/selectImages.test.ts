/*
 * 選擇發佈嘅短篇圖（api 0.12.0，.proj-docs/plans/2026-11-14_plan_publish-change-accuracy.md #1 #2）：
 * 冇揀 / 未完成嘅新短篇連圖一齊拎走；換返上次版本嘅短篇用上次發佈嘅圖；確認發佈頁預覽同真發佈一致
 */
import { env } from 'cloudflare:test';
import { adminGet, adminRequest } from './helpers';
import { DISC, TILE, drama, putEntry, seed } from './fixtures';

type Json = Record<string, unknown>;

const ARC_ADDED = '2026-10-24';
const OLD_ART = '1111111111111111.webp';
const NEW_ART = '2222222222222222.webp';
/** 蘭茜夫人劇場「戀愛後二分一」：新短篇、冇揀 */
const NEW_ARC = { id: 'season-2', name: 'Season 2', addedAt: ARC_ADDED, episodes: 2 };
/** 森美小儀系列「大衛營」：未完成（未確認 ID + 未上架） */
const INCOMPLETE_ARC = { id: 'golden-03', name: 'Season 3', addedAt: ARC_ADDED, episodes: 1 };
const NEW_KEY = 'newArc/golden/season-2';
const INCOMPLETE_KEY = 'newArc/golden/golden-03';
const BASE_IMAGES = { 'tile.webp': TILE, 'disc.webp': DISC };

const json = async (response: Response) => (await response.json()) as Json;

const putAsset = (name: string) =>
    env.DB.prepare(
        'INSERT OR IGNORE INTO assets (hash, content_type, bytes, created_at) VALUES (?, ?, ?, ?)',
    )
        .bind(name.split('.')[0], 'image/webp', 1, '2026-11-08T00:00:00Z')
        .run();

const addFinding = (arcId: string, arc: string) =>
    env.DB.prepare(
        `INSERT INTO scan_findings (kind, drama_id, arc_id, detail, created_at) VALUES ('newArc', 'golden', ?, ?, ?)`,
    )
        .bind(arcId, JSON.stringify({ arc }), '2026-11-10T00:00:00Z')
        .run();

/** golden 加短篇 + 每個短篇慣例名嘅 tile / disc（arcs/<id>/<slot>.webp） */
const putGolden = (arcs: Json[], art = NEW_ART) => {
    const base = drama(3);
    const images: Json = { ...BASE_IMAGES };
    arcs.forEach((arc) => {
        images[`arcs/${String(arc.id)}/tile.webp`] = art;
        images[`arcs/${String(arc.id)}/disc.webp`] = art;
    });
    return putEntry(
        'dramas',
        'golden',
        { ...base, arcs: [...(base.arcs as Json[]), ...arcs] },
        images,
    );
};

const publish = (selection?: unknown) =>
    adminRequest('POST', '/api/publish', selection === undefined ? {} : { body: { selection } });

const preview = async (selection: unknown) =>
    json(await adminGet(`/api/changes?selection=${encodeURIComponent(JSON.stringify(selection))}`));

const goldenImages = async (): Promise<Json> => {
    const text = (await (await env.CATALOG.get('catalog/v1/catalog.json'))?.text()) ?? '{}';
    const dramas = (JSON.parse(text) as Json).dramas as Json[];
    return dramas.find((entry) => entry.id === 'golden')?.images as Json;
};

const latestHistoryItems = async () => {
    const body = await json(await adminGet('/api/publishes'));
    return ((body.publishes as Json[])[0]?.changes as Json).items as Json[];
};

const kindsOf = (items: unknown) => (items as Json[]).map((item) => item.kind);

beforeEach(async () => {
    await seed(3);
    await putAsset(OLD_ART);
    await putAsset(NEW_ART);
    expect((await publish()).status).toBe(200);
});

describe('selective publish — images of arcs left out (#1)', () => {
    it('should drop an unselected never-published arc with its images and report nothing', async () => {
        await putGolden([NEW_ARC]);
        await addFinding('golden-02', 'Season 2');
        const changes = await preview({ content: [] });
        expect(changes).toMatchObject({ unchanged: true, changes: { items: [] } });
        expect((await json(await publish({ content: [] }))).unchanged).toBe(true);
        expect(Object.keys(await goldenImages()).sort()).toEqual(['disc.webp', 'tile.webp']);
    });

    it('should drop an incomplete arc and its images, keep the selected one, and agree with history', async () => {
        await putGolden([NEW_ARC, { ...INCOMPLETE_ARC, enabled: false }]);
        await addFinding('golden-02', 'Season 2');
        await addFinding('golden-03', 'Season 3');
        const selection = { content: [NEW_KEY, INCOMPLETE_KEY] };
        const previewed = (await preview(selection)).changes as Json;
        expect(kindsOf(previewed.items)).toEqual(['newArc']);
        expect((await publish(selection)).status).toBe(200);
        expect(Object.keys(await goldenImages()).sort()).toEqual([
            'arcs/season-2/disc.webp',
            'arcs/season-2/tile.webp',
            'disc.webp',
            'tile.webp',
        ]);
        // 確認發佈頁預覽 = 發佈之後記錄頁見到嘅
        expect(await latestHistoryItems()).toEqual(previewed.items);
    });

    it('should keep a file a remaining slot still points to', async () => {
        // 新短篇 tile 共用劇集嘅 tile.webp、disc 用自己嘅：拎走短篇只刪 disc
        const base = drama(3);
        const arcs = [...(base.arcs as Json[]), { ...NEW_ARC, tile: 'tile.webp' }];
        const images = { ...BASE_IMAGES, 'arcs/season-2/disc.webp': NEW_ART };
        await putEntry('dramas', 'golden', { ...base, arcs }, images);
        await addFinding('golden-02', 'Season 2');
        await publish({ content: [] });
        const kept = await goldenImages();
        expect(Object.keys(kept).sort()).toEqual(['disc.webp', 'tile.webp']);
        expect(String(kept['tile.webp'])).toContain(TILE);
    });
});

describe('selective publish — arcs replaced by the last published version (#2)', () => {
    const LOCKED = { ...NEW_ARC, id: 'golden-02' };

    it('should use the last published images for the unselected arc', async () => {
        await putGolden([LOCKED], OLD_ART);
        await addFinding('golden-02', 'Season 2');
        expect((await publish()).status).toBe(200);
        const before = await goldenImages();
        await putGolden([{ ...LOCKED, summary: '改咗' }], NEW_ART);
        const changes = await preview({ content: [] });
        expect(changes).toMatchObject({ unchanged: true, changes: { items: [] } });
        expect((await json(await publish({ content: [] }))).unchanged).toBe(true);
        expect(await goldenImages()).toEqual(before);
        expect(String((await goldenImages())['arcs/golden-02/tile.webp'])).toContain(OLD_ART);
    });
});
