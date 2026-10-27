import { act, renderHook, waitFor } from '@testing-library/react';
import { createHookWrapper, recording } from '../../tests/renderWithProviders';
import { dramaArtFor, dramaThemeFor, seriesEpisodesOf } from '../dramas';
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
        expect(result.current.mini?.region).toBe('正在播放（今日節目）');
        expect(result.current.mini?.openLabel).toBe('開啟 雲妮鍾情 節目頁');
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
        // 最近一日唔係今日：冇「今日」標籤
        expect(mini?.tags).toEqual([undefined]);
    });

    it('tags today’s shows 今日 and leaves 今日 out of the date-only subtitle', async () => {
        const { mini } = await ready(setup().result);

        expect(mini?.tags).toEqual(['today', 'today']);
        expect(mini?.subtitle).toBe('19/10（一）');
        expect(mini?.region).toBe('正在播放（今日節目）');
        expect(mini?.positionLabel).toBeUndefined();
    });

    describe('with an older episode loaded (重溫)', () => {
        const OLD = recording('badgirl', '2026-10-12', '1000');

        const playOld = async () => {
            const view = setup();
            await ready(view.result);
            await act(() => view.result.current.player.load(OLD, { autoplay: true }));
            return view;
        };

        it('puts it first, tagged 重溫, and shows it with its time', async () => {
            const { audio, result } = await playOld();
            act(() => {
                audio.emitMetadata(7110);
                audio.emitTime(760);
            });

            const mini = result.current.mini;
            expect(mini).toMatchObject({
                showName: 'Bad Girl大過佬',
                region: '正在播放（重溫及今日節目）',
                openLabel: '開啟 Bad Girl大過佬 節目頁，重溫 12/10（一）',
                subtitle: '12/10（一） · 12:40 / 1:58:30',
                isPlaying: true,
                labels: ['Bad Girl大過佬，重溫 12/10（一）', 'Bad Girl大過佬', '雲妮鍾情'],
                keys: [OLD.url, BADGIRL.url, WANNI.url],
                tags: ['rewatch', 'today', 'today'],
                index: 0,
            });
            expect(mini?.positionLabel?.(1, 3)).toBe('第 1 個節目，共 3 個');
        });

        it('only shows a today show swiped to, without loading it, and keeps the old one playing', async () => {
            const { audio, result } = await playOld();

            act(() => result.current.mini?.onChange(1));

            expect(audio.src).toBe(OLD.url);
            expect(audio.play).toHaveBeenCalledTimes(1);
            expect(result.current.mini).toMatchObject({
                showName: 'Bad Girl大過佬',
                openLabel: '開啟 Bad Girl大過佬 節目頁',
                subtitle: '19/10（一）',
                isPlaying: false,
                index: 1,
            });
            expect(result.current.mini?.tags?.[1]).toBe('today');
        });

        it('swipes back to the old one, still playing', async () => {
            const { result } = await playOld();

            act(() => result.current.mini?.onChange(2));
            act(() => result.current.mini?.onChange(0));

            expect(result.current.mini).toMatchObject({ index: 0, isPlaying: true });
        });

        it('drops the old one once a today show is played instead', async () => {
            const { audio, result } = await playOld();
            act(() => result.current.mini?.onChange(2));

            await act(async () => result.current.mini?.onToggle());

            expect(audio.src).toBe(WANNI.url);
            expect(result.current.mini).toMatchObject({
                showName: '雲妮鍾情',
                region: '正在播放（今日節目）',
                keys: [BADGIRL.url, WANNI.url],
                tags: ['today', 'today'],
                index: 1,
                isPlaying: true,
            });
        });
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
                region: '正在播放（廣播劇）',
                openLabel: '開啟 芝See菇Bi Family 廣播劇頁',
                theme: dramaThemeFor('chisee'),
                subtitle: 'Ｘ時mas時小提議 · 第 2 集 哥哥你洽我 · 5:00 / 20:00',
                isPlaying: true,
                progress: 0.25,
                labels: ['芝See菇Bi Family'],
                index: 0,
            });
        });

        it('spins the disc of the season that plays', async () => {
            const s3 = seriesEpisodesOf('golden').find((e) => e.arc === 'Season 3');
            if (!s3) throw new Error('missing fixture');
            const { result } = setup();
            await act(() => result.current.player.load(s3, { autoplay: true }));

            expect(result.current.mini?.theme).toEqual({
                ...dramaThemeFor('golden'),
                art: dramaArtFor(s3),
            });
            expect(result.current.mini?.theme.art).not.toBe(dramaThemeFor('golden').art);
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
