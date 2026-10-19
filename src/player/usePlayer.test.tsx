import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FakeAudio } from '../../tests/fakeAudio';
import { getProgress, isWatched, saveProgress } from '../services/progressStore';
import type { Recording } from '../types/recording';
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

    it('throws when used outside the provider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => usePlayer())).toThrow();
    });
});
