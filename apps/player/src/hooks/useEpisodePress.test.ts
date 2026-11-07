import { act, renderHook } from '@testing-library/react';
import { createHookWrapper, recording } from '../../tests/renderWithProviders';
import { useEpisodePress } from './useEpisodePress';

const OLDER = recording('gongzi', '2026-10-17');
const NEWER = recording('gongzi', '2026-10-18');
const EPISODES = [NEWER, OLDER];
/** 唔喺清單入面嘅集（例如清單已經換咗）：揀 / 撳都唔應該郁 player */
const UNLISTED = recording('gongzi', '2026-10-10');

interface Props {
    currentUrl: string | undefined;
    isPlayingCurrent: boolean;
}

const renderPress = (initial: Props) => {
    const { audio, wrapper } = createHookWrapper(EPISODES);
    const hook = renderHook(
        ({ currentUrl, isPlayingCurrent }: Props) =>
            useEpisodePress(EPISODES, currentUrl, isPlayingCurrent),
        { wrapper, initialProps: initial },
    );
    return { audio, ...hook };
};

describe('useEpisodePress', () => {
    it('should load and play the picked episode when selecting', async () => {
        const { audio, result } = renderPress({ currentUrl: undefined, isPlayingCurrent: false });

        await act(async () => result.current.selectEpisode(OLDER.url));

        expect(audio.src).toBe(OLDER.url);
        expect(audio.play).toHaveBeenCalled();
    });

    it('should pause when pressing the episode that is playing', async () => {
        const { audio, result, rerender } = renderPress({
            currentUrl: undefined,
            isPlayingCurrent: false,
        });
        await act(async () => result.current.selectEpisode(NEWER.url));
        rerender({ currentUrl: NEWER.url, isPlayingCurrent: true });
        audio.pause.mockClear();

        await act(async () => result.current.pressEpisode(NEWER.url));

        expect(audio.pause).toHaveBeenCalled();
        expect(audio.paused).toBe(true);
        expect(audio.src).toBe(NEWER.url);
    });

    it('should play the current episode when pressing it while not playing it', async () => {
        const { audio, result } = renderPress({ currentUrl: NEWER.url, isPlayingCurrent: false });

        await act(async () => result.current.pressEpisode(NEWER.url));

        expect(audio.src).toBe(NEWER.url);
        expect(audio.play).toHaveBeenCalled();
        expect(audio.pause).not.toHaveBeenCalled();
    });

    it('should switch to another episode when pressing it while playing', async () => {
        const { audio, result } = renderPress({ currentUrl: NEWER.url, isPlayingCurrent: true });

        await act(async () => result.current.pressEpisode(OLDER.url));

        expect(audio.src).toBe(OLDER.url);
    });

    it('should do nothing when selecting an episode that is not listed', async () => {
        const { audio, result } = renderPress({ currentUrl: undefined, isPlayingCurrent: false });

        await act(async () => result.current.selectEpisode(UNLISTED.url));

        expect(audio.src).toBe('');
        expect(audio.play).not.toHaveBeenCalled();
        expect(audio.pause).not.toHaveBeenCalled();
    });

    it('should keep the current episode when pressing one that is not listed', async () => {
        const { audio, result, rerender } = renderPress({
            currentUrl: undefined,
            isPlayingCurrent: false,
        });
        await act(async () => result.current.selectEpisode(NEWER.url));
        rerender({ currentUrl: NEWER.url, isPlayingCurrent: true });
        audio.play.mockClear();
        audio.pause.mockClear();

        await act(async () => result.current.pressEpisode(UNLISTED.url));

        expect(audio.src).toBe(NEWER.url);
        expect(audio.play).not.toHaveBeenCalled();
        expect(audio.pause).not.toHaveBeenCalled();
    });
});
