/* 還原（0.11.0）review 修正：W-745 慣例檔名、W-746 prototype 名、S-1009 圖 URL fail closed、S-1006 cache */
import { env } from 'cloudflare:test';
import { adminPost } from './helpers';
import { applyRevert } from '../src/content/revert';
import { DISC, TILE, putEntry, seed } from './fixtures';
import {
    NEW_TILE,
    getJson,
    putNewTileAsset,
    revert,
    stored,
    twoArcs,
    type Json,
} from './revertHelpers';

const ARC_TILE = 'arcs/season-1/tile.webp';

/** 短篇冇 tile / disc key（用慣例檔名 arcs/<id>/tile.webp）；劇頂層 publish 一定要有 tile / disc */
const conventional = twoArcs;

const IMAGES: Json = { 'tile.webp': TILE, 'disc.webp': DISC, [ARC_TILE]: TILE };

beforeEach(async () => {
    await seed(3);
    await putNewTileAsset();
    await putEntry('dramas', 'golden', conventional(), IMAGES);
    await adminPost('/api/publish');
});

describe('revert with conventional image names (W-745)', () => {
    it('should restore the top-level image when neither definition has a tile key', () => {
        // 頂層冇 key 過唔到 publish 驗證，所以直接試純邏輯
        const definition = conventional();
        delete definition.tile;
        const published = { definition, images: IMAGES };
        const current = { definition, images: { ...IMAGES, 'tile.webp': NEW_TILE } };
        const source = { entry: published, unresolvedImages: new Set<string>() };
        expect(applyRevert(current, source, [{ field: 'tile' }])).toEqual(published);
    });

    it('should restore an arc tile image when the arc has no tile key', async () => {
        await putEntry('dramas', 'golden', conventional(), { ...IMAGES, [ARC_TILE]: NEW_TILE });
        const response = await revert('dramas', 'golden', {
            items: [{ arc: 'season-1', field: 'tile' }],
        });
        expect(response.status).toBe(200);
        expect((await stored('dramas', 'golden')).images).toEqual(IMAGES);
    });
});

describe('revert with Object.prototype names (W-746)', () => {
    it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])(
        'should answer 400 for field %s',
        async (field) => {
            expect((await revert('dramas', 'golden', { items: [{ field }] })).status).toBe(400);
            const arcItem = { items: [{ arc: 'season-1', field }] };
            expect((await revert('dramas', 'golden', arcItem)).status).toBe(400);
        },
    );
});

describe('revert of new episodes (S-1008)', () => {
    it.each([
        [{ field: 'episodes' }],
        [{ field: 'episodeDates' }],
        [{ arc: 'season-1', field: 'episodes' }],
        [{ arc: 'season-1', field: 'episodeDates' }],
    ])('should answer 400 for %j: new episodes are handled by publish', async (item) => {
        await putEntry(
            'dramas',
            'golden',
            {
                ...twoArcs(),
                arcs: (twoArcs().arcs as Json[]).map((arc) => ({ ...arc, episodes: 9 })),
            },
            IMAGES,
        );
        expect((await revert('dramas', 'golden', { items: [item] })).status).toBe(400);
        const arcs = (await stored('dramas', 'golden')).definition.arcs as Json[];
        expect(arcs[0]?.episodes).toBe(9);
    });
});

/** 將最新 publish document 入面 golden 嘅 tile.webp 換做 Worker 以外嘅 URL（hash 一齊換，見 S-1006 cache key） */
const foreignTileUrl = async () => {
    const row = await env.DB.prepare(
        "SELECT id, document FROM publishes WHERE status = 'ok' ORDER BY id DESC LIMIT 1",
    ).first<{ id: number; document: string }>();
    const document = JSON.parse(row?.document ?? '{}') as { dramas: Json[] };
    const golden = document.dramas.find((entry) => entry.id === 'golden') as Json;
    (golden.images as Json)['tile.webp'] = 'https://elsewhere.example/tile.webp';
    await env.DB.prepare('UPDATE publishes SET document = ?, hash = ? WHERE id = ?')
        .bind(JSON.stringify(document), 'foreign', row?.id ?? 0)
        .run();
};

describe('published image URLs that cannot be resolved (S-1009)', () => {
    it('should leave the D1 image key alone instead of deleting it', async () => {
        await foreignTileUrl();
        await putEntry('dramas', 'golden', conventional(), { ...IMAGES, 'tile.webp': NEW_TILE });
        expect((await revert('dramas', 'golden', { items: [{ field: 'tile' }] })).status).toBe(200);
        expect((await stored('dramas', 'golden')).images['tile.webp']).toBe(NEW_TILE);
    });

    it('should not leak the unresolved names into GET', async () => {
        await foreignTileUrl();
        const { published } = await getJson('dramas', 'golden');
        expect(Object.keys(published ?? {}).sort()).toEqual(['definition', 'images']);
        expect(published?.images).toEqual({ 'disc.webp': DISC, [ARC_TILE]: TILE });
    });
});

describe('published version cache (S-1006)', () => {
    it('should read and parse the latest document once for several GETs', async () => {
        expect((await getJson('dramas', 'golden')).published).not.toBeNull();
        // 同一個 id + hash：唔會再讀 document（換咗全文都唔知）
        await env.DB.prepare("UPDATE publishes SET document = '{broken'").run();
        expect((await getJson('dramas', 'golden')).published?.definition.name).toBe('黃金少年');
        expect((await getJson('shows', 'badgirl')).published).not.toBeNull();
    });

    it('should pick up a new publish', async () => {
        expect((await getJson('dramas', 'golden')).published?.definition.name).toBe('黃金少年');
        await putEntry('dramas', 'golden', { ...conventional(), name: '新名' }, IMAGES);
        expect((await getJson('dramas', 'golden')).published?.definition.name).toBe('黃金少年');
        expect((await adminPost('/api/publish')).status).toBe(200);
        expect((await getJson('dramas', 'golden')).published?.definition.name).toBe('新名');
    });
});
