import { act, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FakeAudio } from '../../tests/fakeAudio';
import { MS_PER_SECOND, SLEEP_TIMER_CHECK_MS } from '../config/constants';
import type { Recording } from '../types/recording';
import { PlayerProvider } from './PlayerProvider';
import { usePlayer } from './usePlayer';
import { useSleepTimer } from './useSleepTimer';

const MINUTE_MS = 60 * MS_PER_SECOND;
const START = new Date('2026-11-30T22:30:00+08:00').getTime();
const RECORDING: Recording = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2308',
    id: 'id:https://audio.hkfm903.live/gongzi/20261017.aac',
    url: 'https://audio.hkfm903.live/gongzi/20261017.aac',
};

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
});

afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
    localStorage.clear();
});

const setup = (options?: Parameters<typeof useSleepTimer>[0]) => {
    const audio = new FakeAudio();
    const wrapper = ({ children }: { children: ReactNode }) => (
        <PlayerProvider audio={audio.asAudio()}>{children}</PlayerProvider>
    );
    const { result } = renderHook(() => ({ timer: useSleepTimer(options), player: usePlayer() }), {
        wrapper,
    });
    return { audio, result };
};

describe('useSleepTimer', () => {
    it('should throw outside the PlayerProvider', () => {
        expect(() => renderHook(() => useSleepTimer())).toThrow(/PlayerProvider/);
    });

    it('should start with no timer and no last option', () => {
        const { result } = setup();
        expect(result.current.timer.timer).toBeNull();
        expect(result.current.timer.lastOption).toBeNull();
        expect(result.current.timer.remainingMs(Date.now())).toBe(0);
    });

    it('should tick every second while a timer is running', () => {
        const { result } = setup();
        act(() => {
            result.current.timer.start(15);
        });
        expect(result.current.timer.now).toBe(START);
        expect(result.current.timer.remainingMs(result.current.timer.now)).toBe(15 * MINUTE_MS);

        act(() => vi.advanceTimersByTime(SLEEP_TIMER_CHECK_MS));

        expect(result.current.timer.now).toBe(START + SLEEP_TIMER_CHECK_MS);
        expect(result.current.timer.remainingMs(result.current.timer.now)).toBe(
            15 * MINUTE_MS - SLEEP_TIMER_CHECK_MS,
        );
        expect(result.current.timer.fraction(result.current.timer.now)).toBeLessThan(1);
    });

    it('should use the current time right after starting, not a stale idle value', () => {
        const { result } = setup();
        // 冇開 timer 時唔 tick：時間行咗一個鐘
        vi.setSystemTime(START + 60 * MINUTE_MS);

        act(() => {
            result.current.timer.start(15);
        });

        expect(result.current.timer.now).toBe(START + 60 * MINUTE_MS);
        expect(result.current.timer.fraction(result.current.timer.now)).toBe(1);
    });

    it('should clear the timer and pause playback at the deadline', async () => {
        const { audio, result } = setup();
        await act(async () => {
            await result.current.player.load(RECORDING, { autoplay: true });
        });
        expect(result.current.player.isPlaying).toBe(true);
        act(() => {
            result.current.timer.start(15);
        });

        act(() => vi.advanceTimersByTime(15 * MINUTE_MS));

        expect(result.current.timer.timer).toBeNull();
        expect(result.current.timer.lastOption).toBe(15);
        expect(result.current.player.isPlaying).toBe(false);
        expect(audio.pause).toHaveBeenCalled();
    });

    it('should cancel', () => {
        const { result } = setup();
        act(() => {
            result.current.timer.start(30);
        });
        act(() => result.current.timer.cancel());
        expect(result.current.timer.timer).toBeNull();
    });

    it('should reject "end of episode" with nothing loaded', () => {
        const { result } = setup();
        expect(result.current.timer.episodeRemainingMs()).toBeUndefined();
        let started = true;
        act(() => {
            started = result.current.timer.start('episode');
        });
        expect(started).toBe(false);
    });

    it('should not re-render idle components every second', () => {
        const audio = new FakeAudio();
        let renders = 0;
        const Probe = () => {
            useSleepTimer();
            renders += 1;
            return null;
        };
        render(
            <PlayerProvider audio={audio.asAudio()}>
                <Probe />
            </PlayerProvider>,
        );
        const initial = renders;

        act(() => vi.advanceTimersByTime(10 * SLEEP_TIMER_CHECK_MS));

        expect(renders).toBe(initial);
    });

    it('should tick while idle when asked (menu showing the episode remaining time)', () => {
        const { result } = setup({ tickWhileIdle: true });

        act(() => vi.advanceTimersByTime(SLEEP_TIMER_CHECK_MS));

        expect(result.current.timer.now).toBe(START + SLEEP_TIMER_CHECK_MS);
    });
});
