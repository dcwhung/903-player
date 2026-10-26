import type { Progress } from '../services/progressStore';
import type { DailyEpisode, SeriesEpisode } from '../types/drama';
import {
    dailyNewestFirst,
    dramaEpisodeLabel,
    dramaHasNew,
    nextSeriesEpisode,
    episodesInArc,
    hasNoProgress,
    pickDailyStart,
    pickSeriesStart,
    seriesArcs,
} from './dramas';

const series = (arc: string, no: number, title = `第${no}集`): SeriesEpisode => ({
    kind: 'series',
    dramaId: 'chisee',
    url: `/dramas/chisee/${arc}-${no}.m4a`,
    arc,
    no,
    title,
});

const daily = (date: string, rerun = false): DailyEpisode => ({
    kind: 'daily',
    dramaId: 'c18',
    url: `/dramas/c18/${date}.m4a`,
    date,
    rerun,
});

const progress = (updatedAt: number, watched = false): Progress => ({
    position: watched ? 990 : 100,
    duration: 1000,
    watched,
    updatedAt,
});

const SERIES = [series('甲', 2), series('甲', 1), series('乙', 1), series('乙', 2)];

describe('seriesArcs', () => {
    it('lists each arc once in catalogue order', () => {
        expect(seriesArcs(SERIES)).toEqual(['甲', '乙']);
    });
});

describe('episodesInArc', () => {
    it('keeps only that arc, ordered by episode number', () => {
        expect(episodesInArc(SERIES, '甲').map((e) => e.no)).toEqual([1, 2]);
        expect(episodesInArc(SERIES, '丙')).toEqual([]);
    });
});

describe('hasNoProgress', () => {
    it('is true when no episode of the drama has progress', () => {
        expect(hasNoProgress(SERIES, {})).toBe(true);
    });

    it('ignores progress saved for other dramas', () => {
        const other = series('丙', 1);
        expect(hasNoProgress(SERIES, { [other.url]: progress(1) })).toBe(true);
    });

    it('is false once any episode has progress, watched or not', () => {
        expect(hasNoProgress(SERIES, { [SERIES[2]?.url ?? '']: progress(1) })).toBe(false);
        expect(hasNoProgress(SERIES, { [SERIES[0]?.url ?? '']: progress(1, true) })).toBe(false);
    });
});

describe('pickSeriesStart', () => {
    const ordered = [series('甲', 1), series('甲', 2), series('乙', 1)];

    it('starts from the first episode when nothing has been played', () => {
        expect(pickSeriesStart(ordered, {})).toBe(ordered[0]);
    });

    it('resumes the episode touched most recently when it is unfinished', () => {
        const map = {
            [ordered[0]?.url ?? '']: progress(1),
            [ordered[2]?.url ?? '']: progress(5),
        };
        expect(pickSeriesStart(ordered, map)).toBe(ordered[2]);
    });

    it('moves on to the next episode when the latest one was finished', () => {
        const map = { [ordered[0]?.url ?? '']: progress(9, true) };
        expect(pickSeriesStart(ordered, map)).toBe(ordered[1]);
    });

    it('stays on the last episode when the whole series is finished', () => {
        const map = { [ordered[2]?.url ?? '']: progress(9, true) };
        expect(pickSeriesStart(ordered, map)).toBe(ordered[2]);
    });

    it('ignores progress of other dramas', () => {
        expect(pickSeriesStart(ordered, { '/other.m4a': progress(9) })).toBe(ordered[0]);
    });
});

describe('dailyNewestFirst', () => {
    it('orders by air date, newest first, reruns included', () => {
        const list = [daily('2026-10-20'), daily('2025-08-11', true), daily('2026-10-23')];
        expect(dailyNewestFirst(list).map((e) => e.date)).toEqual([
            '2026-10-23',
            '2026-10-20',
            '2025-08-11',
        ]);
    });
});

describe('pickDailyStart', () => {
    const list = [daily('2026-10-24'), daily('2026-10-23'), daily('2026-10-20')];

    it('picks today, or the latest episode before today', () => {
        expect(pickDailyStart(list, '2026-10-23')).toBe(list[1]);
        expect(pickDailyStart(list, '2026-10-22')).toBe(list[2]);
    });

    it('falls back to the oldest when every episode is in the future', () => {
        expect(pickDailyStart(list, '2026-01-01')).toBe(list[2]);
    });
});

describe('dramaHasNew', () => {
    const list = [daily('2026-10-23'), daily('2026-10-22')];

    it('is new when today’s episode is unwatched', () => {
        expect(dramaHasNew(list, '2026-10-23', new Set())).toBe(true);
    });

    it('is not new once today’s episode is watched, or when nothing aired today', () => {
        expect(dramaHasNew(list, '2026-10-23', new Set([list[0]?.url ?? '']))).toBe(false);
        expect(dramaHasNew(list, '2026-10-24', new Set())).toBe(false);
    });

    it('is never new for a series drama', () => {
        expect(dramaHasNew(SERIES, '2026-10-23', new Set())).toBe(false);
    });
});

describe('dramaEpisodeLabel', () => {
    it('names a series episode by arc, number and title', () => {
        expect(dramaEpisodeLabel(series('Ｘ時mas時小提議', 2, '哥哥你洽我'))).toBe(
            'Ｘ時mas時小提議 · 第 2 集 哥哥你洽我',
        );
        expect(dramaEpisodeLabel({ ...series('大妒忌', 1), title: undefined })).toBe(
            '大妒忌 · 第 1 集',
        );
    });

    it('names a daily episode by its date, marking reruns', () => {
        expect(dramaEpisodeLabel(daily('2026-10-23'))).toBe('23/10（五）');
        expect(dramaEpisodeLabel(daily('2025-08-11', true))).toBe('11/08（一） · 重溫');
    });
});

describe('nextSeriesEpisode', () => {
    const ordered = [series('甲', 1), series('甲', 2), series('乙', 1)];

    it('moves to the next episode, then on to the next arc', () => {
        expect(nextSeriesEpisode(ordered, ordered[0]?.url ?? '')).toBe(ordered[1]);
        expect(nextSeriesEpisode(ordered, ordered[1]?.url ?? '')).toBe(ordered[2]);
    });

    it('has nothing after the last episode or for an unknown one', () => {
        expect(nextSeriesEpisode(ordered, ordered[2]?.url ?? '')).toBeUndefined();
        expect(nextSeriesEpisode(ordered, '/nope.m4a')).toBeUndefined();
    });
});
