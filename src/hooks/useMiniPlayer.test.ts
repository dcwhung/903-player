import { act, renderHook, waitFor } from '@testing-library/react';
import { createHookWrapper, recording } from '../../tests/renderWithProviders';
import { DRAMA_THEMES } from '../config/dramaThemes';
import { seriesEpisodesOf } from '../data/dramaCatalog';
import type { SeriesEpisode } from '../types/drama';
import { saveProgress } from '../services/progressStore';
import { usePlayer } from '../player/usePlayer';
import type { Recording } from '../types/recording';
import { useMiniPlayer } from './useMiniPlayer';

const BADGIRL = recording('badgirl', '2026-10-19', '1000');
const WANNI = recording('wanni', '2026-10-19', '1300');
const RECORDINGS = [recording('gongzi', '2026-10-17'), BADGIRL, WANNI];

const setup = (recordings: Recording[] = RECORDINGS) => {
    const { audio, wrapper } = createHookWrapper(recordings);
    const hook = renderHook(() => ({ mini: useMiniPlayer(), player: usePlayer() }), { wrapper });
    return { audio, ...hook };
};

const ready = async (result: ReturnType<typeof setup>['result']) => {
    await waitFor(() => expect(result.current.mini).not.toBeNull());
    return result.current;
};

describe('useMiniPlayer', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z')); // 香港 19/10 16:00
    });
    afterEach(() => vi.useRealTimers());

    it('hides instead of showing an older day on a weekday with nothing up yet', async () => {
        vi.setSystemTime(new Date('2026-10-20T08:00:00Z'));
        const { result } = setup();

        await waitFor(() => expect(result.current.player).toBeDefined());
        expect(result.current.mini).toBeNull();
    });

    it('keeps playing when switching show while loaded and playing', async () => {
        const { audio, result } = setup();
        await ready(result);
        await act(() => result.current.player.load(BADGIRL, { autoplay: true }));

        await act(async () => result.current.mini?.onChange(1));

        expect(audio.src).toBe(WANNI.url);
        expect(audio.play).toHaveBeenCalledTimes(2);
        expect(result.current.mini?.showName).toBe('雲妮鍾情');
    });

    it('gives the time text once the duration is known', async () => {
        const { audio, result } = setup();
        await ready(result);
        expect(result.current.mini?.timeText).toBeUndefined();

        await act(() => result.current.player.load(BADGIRL, { autoplay: true }));
        act(() => {
            audio.emitMetadata(7110);
            audio.emitTime(760);
        });

        expect(result.current.mini?.timeText).toBe('12:40 / 1:58:30');
    });

    it('switches show without autoplay while loaded and paused', async () => {
        const { audio, result } = setup();
        await ready(result);
        await act(() => result.current.player.load(BADGIRL));

        await act(async () => result.current.mini?.onChange(1));

        expect(audio.src).toBe(WANNI.url);
        expect(audio.play).not.toHaveBeenCalled();
    });

    it('only changes the selection when nothing of today is loaded', async () => {
        const { audio, result } = setup();
        await ready(result);

        act(() => result.current.mini?.onChange(1));

        expect(result.current.mini?.showName).toBe('雲妮鍾情');
        expect(result.current.mini?.index).toBe(1);
        expect(audio.src).toBe('');
    });

    it('shows saved progress of a show that is not loaded, reading it once', async () => {
        saveProgress(BADGIRL.url, 600, 2400);
        const { result, rerender } = setup();
        await ready(result);
        const getItem = vi.spyOn(Storage.prototype, 'getItem');

        rerender();
        rerender();

        expect(result.current.mini?.timeText).toBe('10:00 / 40:00');
        expect(getItem).not.toHaveBeenCalled();
        getItem.mockRestore();
    });

    it('does not read saved progress for the loaded show', async () => {
        const { result, rerender } = setup();
        await ready(result);
        await act(() => result.current.player.load(BADGIRL));
        const getItem = vi.spyOn(Storage.prototype, 'getItem');

        rerender();

        expect(getItem).not.toHaveBeenCalled();
        getItem.mockRestore();
    });

    it('falls back to the latest day when nothing was recorded today', async () => {
        vi.setSystemTime(new Date('2026-10-18T08:00:00Z'));
        const { result } = setup();

        const { mini } = await ready(result);

        expect(mini?.showName).toBe('公子會');
        expect(mini?.subtitle).toBe('17/10（六）');
        expect(mini?.labels).toEqual(['公子會']);
        expect(mini?.keys).toEqual([RECORDINGS[0]?.url]);
    });

    it('loads and plays the shown show on toggle when nothing is loaded', async () => {
        const { audio, result } = setup();
        const { mini } = await ready(result);

        await act(async () => mini?.onToggle());

        expect(audio.src).toBe(BADGIRL.url);
        expect(audio.play).toHaveBeenCalledTimes(1);
        expect(result.current.mini?.isPlaying).toBe(true);
    });

    describe('with a drama episode loaded', () => {
        const XMAS = seriesEpisodesOf('chisee').find(
            (e) => e.title === '哥哥你洽我',
        ) as SeriesEpisode;

        it('shows the drama instead of today’s shows, even when no show is up today', async () => {
            vi.setSystemTime(new Date('2026-10-20T08:00:00Z'));
            const { audio, result } = setup();
            await act(() => result.current.player.load(XMAS, { autoplay: true }));
            act(() => {
                audio.emitMetadata(1200);
                audio.emitTime(300);
            });

            const mini = result.current.mini;
            expect(mini).toMatchObject({
                showName: '芝See菇Bi Family',
                theme: DRAMA_THEMES.chisee,
                subtitle: 'Ｘ時mas時小提議 · 第 2 集 哥哥你洽我 · 5:00 / 20:00',
                isPlaying: true,
                progress: 0.25,
                labels: ['芝See菇Bi Family'],
                index: 0,
            });
        });

        it('toggles the drama and opens its page', async () => {
            const { audio, result } = setup();
            await act(() => result.current.player.load(XMAS, { autoplay: true }));

            await act(async () => result.current.mini?.onToggle());

            expect(audio.pause).toHaveBeenCalled();
            expect(audio.src).toBe(XMAS.url);
        });
    });
});
