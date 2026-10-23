import { dailyEpisodesOf, seriesEpisodesOf } from '../data/dramaCatalog';
import type { RowContext } from './episodeItems';
import { toDailyItems, toSeriesItems } from './dramaItems';

const XMAS = seriesEpisodesOf('chisee').filter((e) => e.arc === 'X時mas時小提議');
const C18 = dailyEpisodesOf('c18');

const ctx = (overrides: Partial<RowContext> = {}): RowContext => ({
    currentUrl: undefined,
    live: { currentTime: 0, duration: 0 },
    progressMap: {},
    isPlaying: false,
    ...overrides,
});

describe('toSeriesItems', () => {
    it('labels each row by episode title and number', () => {
        const items = toSeriesItems(XMAS, ctx());
        expect(items.map((i) => [i.dayMonth, i.weekday])).toEqual([
            ['休養下', '第 1 集'],
            ['你洽我', '第 2 集'],
            ['索腳汗', '第 3 集'],
            ['返個人', '第 4 集'],
        ]);
    });

    it('marks the current episode and uses its live time', () => {
        const current = XMAS[1]?.url;
        const items = toSeriesItems(
            XMAS,
            ctx({ currentUrl: current, isPlaying: true, live: { currentTime: 60, duration: 600 } }),
        );
        expect(items[1]).toMatchObject({ key: current, current: true, isPlaying: true });
        expect(items[1]?.status.text).toBe('播放中 · 1:00 / 10:00');
    });
});

describe('toDailyItems', () => {
    it('labels rows by date and tags reruns', () => {
        const items = toDailyItems(C18, ctx());
        const latest = items.find((i) => i.dayMonth === '23/10');
        const rerun = items.find((i) => i.dayMonth === '11/08');
        expect(latest).toMatchObject({ weekday: '星期五', tag: undefined });
        expect(rerun).toMatchObject({ weekday: '星期一', tag: '重溫' });
    });

    it('shows saved progress for episodes that are not current', () => {
        const url = C18[0]?.url ?? '';
        const items = toDailyItems(
            C18,
            ctx({
                progressMap: {
                    [url]: { position: 990, duration: 1000, watched: true, updatedAt: 1 },
                },
            }),
        );
        expect(items[0]?.status.kind).toBe('watched');
    });
});
