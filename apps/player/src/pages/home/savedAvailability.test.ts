/* 收藏 tab / 最近收聽嘅上架 / 下架判斷（P8 #6）：用 mock catalog（真 drama.json 冇下架日） */
import type { Bookmark } from '../../services/bookmarkStore';
import type { SeriesEpisode } from '../../types/drama';
import { bookmarkAvailability, trackLeaving } from './savedItems';

const TODAY = '2026-11-05';

const EPISODES: Record<string, SeriesEpisode> = {
    '/gone': {
        kind: 'series',
        dramaId: 'lancy',
        id: 'id:/gone',
        url: '/gone',
        arc: 'A',
        no: 1,
        removedAt: '2026-11-01',
    },
    '/soon': {
        kind: 'series',
        dramaId: 'lancy',
        id: 'id:/soon',
        url: '/soon',
        arc: 'A',
        no: 2,
        removedAt: '2026-12-05',
    },
    '/ok': { kind: 'series', dramaId: 'lancy', id: 'id:/ok', url: '/ok', arc: 'A', no: 3 },
};

vi.mock('../../catalog/dramas', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../catalog/dramas')>();
    return {
        ...actual,
        dramaStatus: (id: string) => (id === 'gone-drama' ? 'removed' : 'live'),
        catalogEpisodeOf: (_id: string, episodeId: string) =>
            Object.values(EPISODES).find((e) => e.id === episodeId),
    };
});

/** 收藏記低嘅網址可以已經過時（例如搬咗 bucket）：一律用 episode ID 對 catalog */
const series = (dramaId: string, url: string): Bookmark => ({
    kind: 'series',
    dramaId,
    id: `id:${url}`,
    url: `https://old.example${url}`,
    arc: 'A',
    no: 1,
    addedAt: 1,
});

describe('saved tab availability', () => {
    it('should mark an episode removed when it or its whole drama is off the shelf', () => {
        expect(bookmarkAvailability(series('lancy', '/gone'), TODAY).removed).toBe(true);
        expect(bookmarkAvailability(series('gone-drama', '/ok'), TODAY).removed).toBe(true);
        expect(bookmarkAvailability(series('lancy', '/ok'), TODAY)).toEqual({ removed: false });
    });

    it('should give the amber leaving day for an episode leaving soon (LB1 / LR1)', () => {
        const leaving = { text: '05/12 下架', label: '05/12 星期六 下架' };
        expect(bookmarkAvailability(series('lancy', '/soon'), TODAY)).toEqual({
            removed: false,
            leaving,
        });
        expect(trackLeaving(EPISODES['/soon'] as SeriesEpisode, TODAY)).toEqual(leaving);
        expect(trackLeaving(EPISODES['/ok'] as SeriesEpisode, TODAY)).toBeUndefined();
    });
});
