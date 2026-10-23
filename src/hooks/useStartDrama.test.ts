import { act, renderHook } from '@testing-library/react';
import { createHookWrapper } from '../../tests/renderWithProviders';
import { DRAMAS } from '../config/dramas';
import { dailyEpisodesOf, seriesEpisodesOf } from '../data/dramaCatalog';
import { usePlayer } from '../player/usePlayer';
import { dramaStartEpisode, useStartDrama } from './useStartDrama';

const [CHISEE, C18] = DRAMAS as [(typeof DRAMAS)[number], (typeof DRAMAS)[number]];
const SERIES = seriesEpisodesOf('chisee');
const DAILY = dailyEpisodesOf('c18');

describe('dramaStartEpisode', () => {
    it('resumes the series from saved progress', () => {
        const url = SERIES[5]?.url ?? '';
        const map = { [url]: { position: 60, duration: 600, watched: false, updatedAt: 1 } };
        expect(dramaStartEpisode(CHISEE, map, '2026-10-23')).toBe(SERIES[5]);
    });

    it('starts the daily drama on today’s episode', () => {
        expect(dramaStartEpisode(C18, {}, '2026-10-23')).toBe(
            DAILY.find((e) => e.date === '2026-10-23'),
        );
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
