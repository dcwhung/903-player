import { act, renderHook } from '@testing-library/react';
import { createHookWrapper, recording } from '../../tests/renderWithProviders';
import { useEpisodePress } from './useEpisodePress';

const OLDER = recording('gongzi', '2026-10-17');
const NEWER = recording('gongzi', '2026-10-18');
const EPISODES = [NEWER, OLDER];

interface Props {
    currentUrl: string | undefined;
    isPlayingCurrent: boolean;
    onSelect?: () => void;
}

const renderPress = (initial: Props) => {
    const { audio, wrapper } = createHookWrapper(EPISODES);
    const hook = renderHook(
        ({ currentUrl, isPlayingCurrent, onSelect }: Props) =>
            useEpisodePress(EPISODES, currentUrl, isPlayingCurrent, onSelect),
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

    describe('onSelect', () => {
        it('should tell the caller when an episode is picked', async () => {
            const onSelect = vi.fn();
            const { result } = renderPress({
                currentUrl: undefined,
                isPlayingCurrent: false,
                onSelect,
            });

            await act(async () => result.current.selectEpisode(OLDER.url));
            await act(async () => result.current.pressEpisode(NEWER.url));

            expect(onSelect).toHaveBeenCalledTimes(2);
        });

        it('should not tell the caller when pressing the playing episode only pauses it', async () => {
            const onSelect = vi.fn();
            const { result } = renderPress({
                currentUrl: NEWER.url,
                isPlayingCurrent: true,
                onSelect,
            });

            await act(async () => result.current.pressEpisode(NEWER.url));

            expect(onSelect).not.toHaveBeenCalled();
        });
    });
});
