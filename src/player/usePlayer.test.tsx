import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FakeAudio } from '../../tests/fakeAudio';
import { getProgress, isWatched, saveProgress } from '../services/progressStore';
import type { Recording } from '../types/recording';
import { AudioController } from './AudioController';
import { PlayerProvider } from './PlayerProvider';
import { usePlayer } from './usePlayer';

const RECORDING: Recording = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2308',
    url: 'https://audio.hkfm903.live/gongzi/20261017.aac',
};
const DURATION = 1000;

const setup = () => {
    const audio = new FakeAudio();
    const wrapper = ({ children }: { children: ReactNode }) => (
        <PlayerProvider audio={audio.asAudio()}>{children}</PlayerProvider>
    );
    const { result } = renderHook(() => usePlayer(), { wrapper });
    return { audio, result };
};

describe('usePlayer', () => {
    it('should reject audio and controller together at the type level', () => {
        // 兩樣都傳會令 audio 被靜靜雞忽略，所以要喺型別層面擋
        const audio = new FakeAudio().asAudio();
        const element = (
            // @ts-expect-error audio 同 controller 只可以傳其中一個
            <PlayerProvider audio={audio} controller={new AudioController(audio)}>
                {null}
            </PlayerProvider>
        );
        expect(element).toBeTruthy();
    });

    it('should share state with an injected controller when one is passed', async () => {
        // main.tsx 喺 React 外面都要讀播放狀態（決定幾時靜靜雞更新），所以 controller 由外面建立
        const audio = new FakeAudio();
        const controller = new AudioController(audio.asAudio());
        const wrapper = ({ children }: { children: ReactNode }) => (
            <PlayerProvider controller={controller}>{children}</PlayerProvider>
        );
        const { result } = renderHook(() => usePlayer(), { wrapper });

        await act(async () => result.current.load(RECORDING, { autoplay: true }));

        expect(controller.getSnapshot().isPlaying).toBe(true);
        expect(result.current.isPlaying).toBe(true);
    });

    it('loads a recording and autoplays it', async () => {
        const { audio, result } = setup();

        await act(async () => result.current.load(RECORDING, { autoplay: true }));

        expect(audio.src).toBe(RECORDING.url);
        expect(audio.play).toHaveBeenCalled();
        expect(result.current.isPlaying).toBe(true);
        expect(result.current.recording).toEqual(RECORDING);
    });

    it('resumes from the saved position once metadata is known', async () => {
        saveProgress(RECORDING.url, 300, DURATION);
        const { audio, result } = setup();

        await act(async () => result.current.load(RECORDING));
        act(() => audio.emitMetadata(DURATION));

        expect(audio.currentTime).toBe(300);
        expect(result.current.duration).toBe(DURATION);
    });

    it('restarts from zero and plays', async () => {
        saveProgress(RECORDING.url, 300, DURATION);
        const { audio, result } = setup();
        await act(async () => result.current.load(RECORDING));
        act(() => audio.emitMetadata(DURATION));

        await act(async () => result.current.restart());

        expect(audio.currentTime).toBe(0);
        expect(audio.play).toHaveBeenCalled();
    });

    it('toggles between play and pause', async () => {
        const { audio, result } = setup();
        await act(async () => result.current.load(RECORDING));

        await act(async () => result.current.toggle());
        expect(result.current.isPlaying).toBe(true);

        await act(async () => result.current.toggle());
        expect(audio.pause).toHaveBeenCalled();
        expect(result.current.isPlaying).toBe(false);
    });

    it('plays and pauses explicitly', async () => {
        const { audio, result } = setup();
        await act(async () => result.current.load(RECORDING));

        await act(async () => result.current.play());
        await act(async () => result.current.play());
        expect(result.current.isPlaying).toBe(true);

        act(() => result.current.pause());
        expect(audio.pause).toHaveBeenCalledTimes(1);
        expect(result.current.isPlaying).toBe(false);
    });

    it('skips within the bounds of the recording', async () => {
        const { audio, result } = setup();
        await act(async () => result.current.load(RECORDING));
        act(() => audio.emitMetadata(DURATION));

        act(() => result.current.skip(-60));
        expect(audio.currentTime).toBe(0);

        act(() => result.current.skip(30));
        expect(audio.currentTime).toBe(30);

        act(() => result.current.seek(DURATION + 100));
        expect(audio.currentTime).toBe(DURATION);
    });

    it('tracks current time and marks watched at 95%', async () => {
        const { audio, result } = setup();
        await act(async () => result.current.load(RECORDING));
        act(() => audio.emitMetadata(DURATION));

        act(() => audio.emitTime(500));
        expect(result.current.currentTime).toBe(500);
        expect(isWatched(RECORDING.url)).toBe(false);

        act(() => audio.emitTime(951));
        expect(isWatched(RECORDING.url)).toBe(true);
    });

    it('saves progress when paused and when the page is hidden', async () => {
        const { audio, result } = setup();
        await act(async () => result.current.load(RECORDING, { autoplay: true }));
        act(() => audio.emitMetadata(DURATION));
        act(() => audio.emitTime(123));

        await act(async () => result.current.toggle());
        expect(getProgress(RECORDING.url)?.position).toBe(123);

        act(() => audio.emitTime(200));
        act(() => {
            window.dispatchEvent(new Event('pagehide'));
        });
        expect(getProgress(RECORDING.url)?.position).toBe(200);
    });

    it('stops at the end without autoplaying anything else', async () => {
        const { audio, result } = setup();
        await act(async () => result.current.load(RECORDING, { autoplay: true }));
        act(() => audio.emitMetadata(DURATION));

        act(() => audio.end());

        expect(result.current.isPlaying).toBe(false);
        expect(isWatched(RECORDING.url)).toBe(true);
    });

    it('stop() pauses and saves', async () => {
        const { audio, result } = setup();
        await act(async () => result.current.load(RECORDING, { autoplay: true }));
        act(() => audio.emitMetadata(DURATION));
        act(() => audio.emitTime(42));

        act(() => result.current.stop());

        expect(audio.pause).toHaveBeenCalled();
        expect(getProgress(RECORDING.url)?.position).toBe(42);
    });

    it('stays paused when the browser blocks autoplay', async () => {
        const { audio, result } = setup();
        audio.rejectPlay = true;

        await act(async () => result.current.load(RECORDING, { autoplay: true }));

        expect(result.current.isPlaying).toBe(false);
    });

    it('does not reload the same recording', async () => {
        const { audio, result } = setup();
        await act(async () => result.current.load(RECORDING));
        act(() => audio.emitMetadata(DURATION));
        act(() => audio.emitTime(77));

        await act(async () => result.current.load(RECORDING, { autoplay: true }));

        expect(audio.currentTime).toBe(77);
        expect(audio.play).toHaveBeenCalled();
    });

    it('keeps the saved position when switching away before metadata loads', async () => {
        const other: Recording = { ...RECORDING, date: '2026-10-10', url: `${RECORDING.url}?b` };
        saveProgress(RECORDING.url, 1800, 6000);
        const { result } = setup();

        await act(async () => result.current.load(RECORDING));
        await act(async () => result.current.load(other));

        expect(getProgress(RECORDING.url)?.position).toBe(1800);
    });

    it('keeps the saved position when stopped or hidden before metadata loads', async () => {
        saveProgress(RECORDING.url, 1800, 6000);
        const { result } = setup();

        await act(async () => result.current.load(RECORDING));
        act(() => result.current.stop());
        act(() => {
            window.dispatchEvent(new Event('pagehide'));
        });

        expect(getProgress(RECORDING.url)?.position).toBe(1800);
    });

    it('skips from the resume position when metadata has not loaded yet', async () => {
        saveProgress(RECORDING.url, 1800, 6000);
        const { audio, result } = setup();
        await act(async () => result.current.load(RECORDING));

        act(() => result.current.skip(30));
        act(() => audio.emitMetadata(6000));

        expect(audio.currentTime).toBe(1830);
        expect(result.current.currentTime).toBe(1830);
        expect(getProgress(RECORDING.url)?.position).toBe(1800);
    });

    it('skips from the resume position after switching episodes before metadata loads', async () => {
        const other: Recording = { ...RECORDING, date: '2026-10-15', url: `${RECORDING.url}?b` };
        saveProgress(other.url, 100, 6000);
        const { audio, result } = setup();
        await act(async () => result.current.load(RECORDING, { autoplay: true }));
        act(() => audio.emitMetadata(DURATION));
        act(() => audio.emitTime(60));

        await act(async () => result.current.load(other, { autoplay: true }));
        expect(result.current.currentTime).toBe(100);
        act(() => result.current.skip(30));
        act(() => audio.emitMetadata(6000));

        expect(audio.currentTime).toBe(130);
        expect(getProgress(other.url)?.position).toBe(100);
    });

    it('keeps tracking time when the browser reports an infinite duration', async () => {
        const { audio, result } = setup();
        await act(async () => result.current.load(RECORDING));
        act(() => audio.emitMetadata(Number.POSITIVE_INFINITY));

        act(() => audio.emitTime(60));
        act(() => result.current.stop());

        expect(result.current.currentTime).toBe(60);
        expect(getProgress(RECORDING.url)?.position).toBe(60);
    });

    it('does not restart a watched episode that is still playing', async () => {
        const { audio, result } = setup();
        await act(async () => result.current.load(RECORDING, { autoplay: true }));
        act(() => audio.emitMetadata(DURATION));
        act(() => audio.emitTime(990));

        await act(async () => result.current.load(RECORDING, { autoplay: true }));

        expect(audio.currentTime).toBe(990);
    });

    it('restarts a watched episode that is reloaded while parked at the end', async () => {
        const { audio, result } = setup();
        await act(async () => result.current.load(RECORDING));
        act(() => audio.emitMetadata(DURATION));
        act(() => audio.emitTime(990));

        await act(async () => result.current.load(RECORDING, { autoplay: true }));

        expect(audio.currentTime).toBe(0);
    });

    describe('replaying a watched episode', () => {
        const replayWatched = async (options = { autoplay: true }) => {
            saveProgress(RECORDING.url, DURATION, DURATION);
            const { audio, result } = setup();
            await act(async () => result.current.load(RECORDING, options));
            act(() => audio.emitMetadata(DURATION));
            return { audio, result };
        };

        // 模擬瀏覽器每 0.25 秒發一次 timeupdate
        const playThrough = (audio: FakeAudio, from: number, to: number) => {
            for (let t = from; t <= to; t += 0.25) {
                act(() => audio.emitTime(t));
            }
        };

        it('keeps the watched tick before 10 seconds of playback', async () => {
            const { audio, result } = await replayWatched();
            const revision = result.current.watchedRevision;

            playThrough(audio, 0, 5);
            act(() => result.current.pause());

            expect(isWatched(RECORDING.url)).toBe(true);
            expect(result.current.watchedRevision).toBe(revision);
        });

        it('clears watched after 10 seconds of playback and bumps the revision', async () => {
            const { audio, result } = await replayWatched();
            const revision = result.current.watchedRevision;

            playThrough(audio, 0, 10.25);

            expect(isWatched(RECORDING.url)).toBe(false);
            expect(getProgress(RECORDING.url)?.position).toBeGreaterThanOrEqual(10);
            expect(result.current.watchedRevision).toBe(revision + 1);
        });

        it('marks watched again when the replay reaches 95%', async () => {
            const { audio, result } = await replayWatched();
            playThrough(audio, 0, 10.25);
            const revision = result.current.watchedRevision;

            act(() => audio.emitTime(951));

            expect(isWatched(RECORDING.url)).toBe(true);
            expect(result.current.watchedRevision).toBe(revision + 1);
        });

        it('does not count a seek as listening time', async () => {
            const { audio, result } = await replayWatched();

            playThrough(audio, 0, 2);
            act(() => result.current.seek(300));
            playThrough(audio, 300, 305);

            expect(isWatched(RECORDING.url)).toBe(true);
        });

        it('does not count time while paused', async () => {
            const { audio } = await replayWatched({ autoplay: false });

            playThrough(audio, 0, 20);

            expect(isWatched(RECORDING.url)).toBe(true);
        });

        it('adds up playback across a pause', async () => {
            const { audio, result } = await replayWatched();

            playThrough(audio, 0, 5);
            act(() => result.current.pause());
            await act(async () => result.current.play());
            playThrough(audio, 5.25, 10.25);

            expect(isWatched(RECORDING.url)).toBe(false);
        });

        it('clears watched after restart() on a watched episode is played for 10 seconds', async () => {
            const { audio, result } = setup();
            await act(async () => result.current.load(RECORDING, { autoplay: true }));
            act(() => audio.emitMetadata(DURATION));
            act(() => audio.emitTime(960));
            expect(isWatched(RECORDING.url)).toBe(true);

            await act(async () => result.current.restart());
            playThrough(audio, 0, 10.25);

            expect(isWatched(RECORDING.url)).toBe(false);
        });

        it('clears watched when an episode parked at the end is replayed for 10 seconds', async () => {
            const { audio, result } = setup();
            await act(async () => result.current.load(RECORDING));
            act(() => audio.emitMetadata(DURATION));
            act(() => audio.emitTime(990));

            await act(async () => result.current.load(RECORDING, { autoplay: true }));
            playThrough(audio, 0, 10.25);

            expect(isWatched(RECORDING.url)).toBe(false);
        });

        it('does not clear watched while finishing the first listen', async () => {
            const { audio, result } = setup();
            await act(async () => result.current.load(RECORDING, { autoplay: true }));
            act(() => audio.emitMetadata(DURATION));

            playThrough(audio, 950, 975);

            expect(isWatched(RECORDING.url)).toBe(true);
        });
    });

    it('throws when used outside the provider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => usePlayer())).toThrow();
    });
});
