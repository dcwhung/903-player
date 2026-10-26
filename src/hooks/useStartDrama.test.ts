import { act, renderHook } from '@testing-library/react';
import { createHookWrapper } from '../../tests/renderWithProviders';
import { dailyEpisodesOf, findDrama, seriesEpisodesOf, type Drama } from '../dramas';
import { usePlayer } from '../player/usePlayer';
import { dramaStartEpisode, isFirstSeriesVisit, useStartDrama } from './useStartDrama';

const mustFind = (id: string): Drama => {
    const drama = findDrama(id);
    if (!drama) throw new Error(`missing drama ${id}`);
    return drama;
};
const CHISEE = mustFind('chisee');
const C18 = mustFind('c18');
const SERIES = seriesEpisodesOf('chisee');
const DAILY = dailyEpisodesOf('c18');

describe('dramaStartEpisode', () => {
    it('resumes the series from saved progress', () => {
        const url = SERIES[6]?.url ?? '';
        const map = { [url]: { position: 60, duration: 600, watched: false, updatedAt: 1 } };
        expect(dramaStartEpisode(CHISEE, map, '2026-10-23')).toBe(SERIES[6]);
    });

    it('starts the daily drama on today’s episode', () => {
        expect(dramaStartEpisode(C18, {}, '2026-10-23')).toBe(
            DAILY.find((e) => e.date === '2026-10-23'),
        );
    });
});

describe('isFirstSeriesVisit', () => {
    const touched = (url: string) => ({
        [url]: { position: 60, duration: 600, watched: false, updatedAt: 1 },
    });

    it('is a first visit for a series drama with no progress at all', () => {
        expect(isFirstSeriesVisit(CHISEE, {}, null)).toBe(true);
    });

    it('is not a first visit once any of its episodes has progress', () => {
        expect(isFirstSeriesVisit(CHISEE, touched(SERIES.at(-1)?.url ?? ''), null)).toBe(false);
    });

    it('is not a first visit while one of its episodes is loaded, even with no progress yet', () => {
        // 喺全集揀咗一行：載入咗但未播，所以未有進度
        expect(isFirstSeriesVisit(CHISEE, {}, SERIES[3] ?? null)).toBe(false);
    });

    it('is still a first visit while another drama is loaded', () => {
        expect(isFirstSeriesVisit(CHISEE, {}, DAILY[0] ?? null)).toBe(true);
    });

    it('never counts a daily drama as a first visit', () => {
        expect(isFirstSeriesVisit(C18, {}, null)).toBe(false);
    });
});

describe('useStartDrama', () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
    afterEach(() => vi.useRealTimers());

    const setup = () => {
        vi.setSystemTime(new Date('2026-10-23T08:00:00Z')); // 香港 23/10 16:00
        const { audio, wrapper } = createHookWrapper();
        const hook = renderHook(() => ({ start: useStartDrama(), player: usePlayer() }), {
            wrapper,
        });
        return { audio, ...hook };
    };

    it('loads and plays the start episode', () => {
        const { audio, result } = setup();

        act(() => result.current.start(C18));

        expect(audio.src).toBe(DAILY.find((e) => e.date === '2026-10-23')?.url);
        expect(audio.play).toHaveBeenCalled();
    });

    it('keeps the episode already loaded from that drama instead of jumping back', async () => {
        const { audio, result } = setup();
        const rerun = DAILY.find((e) => e.rerun) as (typeof DAILY)[number];
        await act(() => result.current.player.load(rerun, { autoplay: true }));
        act(() => result.current.player.pause());

        await act(async () => result.current.start(C18));

        expect(audio.src).toBe(rerun.url);
        expect(audio.play).toHaveBeenCalledTimes(2);
    });
});
