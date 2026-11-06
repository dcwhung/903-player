import type { Progress } from '../services/progressStore';
import type { Bookmark } from '../services/bookmarkStore';
import {
    RECENT_MAX,
    groupBookmarks,
    recentColumns,
    recentListens,
    savedGrid,
    thirdTabOf,
} from './bookmarks';

const show = (showId: string, date: string, addedAt: number): Bookmark => ({
    kind: 'show',
    url: `${showId}-${date}`,
    showId,
    date,
    time: '2300',
    addedAt,
});
const series = (dramaId: string, arc: string, no: number, addedAt: number): Bookmark => ({
    kind: 'series',
    url: `${dramaId}-${arc}-${no}`,
    dramaId,
    arc,
    no,
    addedAt,
});
const daily = (dramaId: string, date: string, addedAt: number): Bookmark => ({
    kind: 'daily',
    url: `${dramaId}-${date}`,
    dramaId,
    date,
    rerun: false,
    addedAt,
});

// 同 _mockups_/bookmark SAMPLE：added 大 = 新
const SAMPLE: Bookmark[] = [
    show('gongzi', '2026-10-17', 9),
    series('lancy', 'half', 2, 8),
    series('chisee', '36', 3, 7),
    show('badgirl', '2026-10-15', 6),
    show('gongzi', '2026-10-03', 5),
    series('lancy', 'half', 1, 4),
    series('lancy', 'first-love', 5, 3),
    show('wanni', '2026-10-14', 2),
];

const urls = (bookmarks: readonly Bookmark[]) => bookmarks.map((b) => b.url);

describe('groupBookmarks', () => {
    it('should make one box per show / drama, ordered by the newest bookmark in it', () => {
        expect(groupBookmarks(SAMPLE).map((box) => box.key)).toEqual([
            'show:gongzi',
            'drama:lancy',
            'drama:chisee',
            'show:badgirl',
            'show:wanni',
        ]);
    });

    it('should split a series drama into one section per arc, newest first', () => {
        const lancy = groupBookmarks(SAMPLE)[1];

        expect(lancy?.kind).toBe('drama');
        expect(lancy?.id).toBe('lancy');
        expect(lancy?.sections.map((s) => s.arc)).toEqual(['half', 'first-love']);
    });

    it('should list show dates newest first and drama episodes by number', () => {
        const [gongzi, lancy] = groupBookmarks(SAMPLE);

        expect(gongzi?.sections).toHaveLength(1);
        expect(gongzi?.sections[0]?.arc).toBeUndefined();
        expect(urls(gongzi?.sections[0]?.items ?? [])).toEqual([
            'gongzi-2026-10-17',
            'gongzi-2026-10-03',
        ]);
        expect(urls(lancy?.sections[0]?.items ?? [])).toEqual(['lancy-half-1', 'lancy-half-2']);
    });

    it('should keep a daily drama in one section, dates newest first', () => {
        const [box] = groupBookmarks([
            daily('c18', '2026-10-01', 1),
            daily('c18', '2026-10-09', 2),
        ]);

        expect(box?.key).toBe('drama:c18');
        expect(urls(box?.sections[0]?.items ?? [])).toEqual(['c18-2026-10-09', 'c18-2026-10-01']);
    });

    it('should return nothing without bookmarks', () => {
        expect(groupBookmarks([])).toEqual([]);
    });
});

const progress = (updatedAt: number): Progress => ({
    position: 10,
    duration: 600,
    watched: false,
    updatedAt,
});

describe('recentListens', () => {
    const resolve = (url: string) => (url.startsWith('?') ? undefined : url.toUpperCase());

    it('should pick the newest listens, skip bookmarked and unknown URLs', () => {
        const progressMap = { a: progress(1), b: progress(3), c: progress(2), '?x': progress(9) };

        expect(recentListens({ progressMap, bookmarked: new Set(['b']), resolve })).toEqual([
            'C',
            'A',
        ]);
    });

    it('should keep at most RECENT_MAX', () => {
        const progressMap = Object.fromEntries(
            Array.from({ length: RECENT_MAX + 3 }, (_, i) => [`u${i}`, progress(i)]),
        );

        const recent = recentListens({ progressMap, bookmarked: new Set(), resolve });
        expect(RECENT_MAX).toBe(10);
        expect(recent).toHaveLength(RECENT_MAX);
        expect(recent[0]).toBe(`U${RECENT_MAX + 2}`);
    });

    it('should be empty without any history', () => {
        expect(recentListens({ progressMap: {}, bookmarked: new Set(), resolve })).toEqual([]);
    });
});

describe('savedGrid', () => {
    it('should use one column on a phone', () => {
        expect(savedGrid({ layout: 'phone', boxCount: 5, hasRecent: true })).toEqual({
            columns: 1,
            solo: false,
        });
    });

    it('should give phone-sideways 2 columns beside the recent panel, 3 without it', () => {
        expect(savedGrid({ layout: 'land', boxCount: 5, hasRecent: true }).columns).toBe(2);
        expect(savedGrid({ layout: 'land', boxCount: 5, hasRecent: false }).columns).toBe(3);
    });

    it('should use 2 columns on the wide layout', () => {
        expect(savedGrid({ layout: 'wide', boxCount: 5, hasRecent: true }).columns).toBe(2);
        expect(savedGrid({ layout: 'wide', boxCount: 2, hasRecent: false }).columns).toBe(2);
    });

    it('should let a single box span the full width as a solo box', () => {
        for (const layout of ['phone', 'land', 'wide'] as const) {
            expect(savedGrid({ layout, boxCount: 1, hasRecent: true })).toEqual({
                columns: 1,
                solo: true,
            });
        }
    });
});

// 第三個 tab 三種狀態（_mockups_/qr-transfer ①）
describe('thirdTabOf', () => {
    it('should be ★ 我的收藏 whenever something is bookmarked', () => {
        expect(thirdTabOf({ hasSaved: true, hasRecent: true })).toBe('saved');
        expect(thirdTabOf({ hasSaved: true, hasRecent: false })).toBe('saved');
    });

    it('should be 最近收聽 with listening history but nothing bookmarked', () => {
        expect(thirdTabOf({ hasSaved: false, hasRecent: true })).toBe('recent');
    });

    it('should hide the tab with neither', () => {
        expect(thirdTabOf({ hasSaved: false, hasRecent: false })).toBeNull();
    });
});

describe('recentColumns', () => {
    it('should list in one column on a phone and two on either landscape layout', () => {
        expect(recentColumns('phone')).toBe(1);
        expect(recentColumns('land')).toBe(2);
        expect(recentColumns('wide')).toBe(2);
    });
});
