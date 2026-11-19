import { FakeAudio } from '../../tests/fakeAudio';
import {
    EARLY_ADVANCE_SECONDS,
    MS_PER_SECOND,
    SLEEP_TIMER_CHECK_MS,
    SLEEP_TIMER_STORAGE_KEY,
} from '../config/constants';
import type { Recording } from '../types/recording';
import { AudioController } from './AudioController';
import { SleepTimerController } from './SleepTimerController';

const MINUTE_MS = 60 * MS_PER_SECOND;
/** 舊版「上次時長」key（S-1201：由每晚排程取代，唔再寫） */
const OLD_LAST_OPTION_KEY = '903player:sleep-timer-last:v1';
const START = new Date('2026-11-30T22:30:00+08:00').getTime();
const DURATION = 1200;

const recording = (name: string): Recording => ({
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2308',
    id: `id:${name}`,
    url: `https://audio.hkfm903.live/${name}.aac`,
});
const EPISODE = recording('episode-1');
const NEXT = recording('episode-2');
const THIRD = recording('episode-3');
const FOLLOWING: Record<string, Recording> = { [EPISODE.id]: NEXT, [NEXT.id]: THIRD };

const cleanups: (() => void)[] = [];

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
});

afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    vi.useRealTimers();
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
});

/** 真 AudioController + 假 audio：驗 timer 同自動接下一集 / 暫停嘅互動 */
const setup = async ({ autoplay = true, nextTrack = true } = {}) => {
    const audio = new FakeAudio();
    const player = new AudioController(audio.asAudio());
    player.setNextTrack(nextTrack ? (track) => FOLLOWING[track.id] : undefined);
    cleanups.push(player.attach());
    await player.load(EPISODE, { autoplay });
    audio.emitMetadata(DURATION);
    // 播到 10 分鐘：呢集剩 10 分鐘
    audio.currentTime = 600;
    audio.emitTime(600);
    await Promise.resolve();
    const timer = new SleepTimerController(player);
    cleanups.push(timer.attach());
    const pause = vi.spyOn(player, 'pause');
    return { audio, player, timer, pause };
};

/** 由而家行 ms，每秒 interval 照跑；timeupdate 唔發（模擬 iOS 背景冇 timeupdate） */
const elapse = (ms: number) => vi.advanceTimersByTime(ms);

describe('SleepTimerController minutes', () => {
    it('should pause playback when the countdown reaches the deadline', async () => {
        const { timer, player, pause } = await setup();
        expect(timer.start(15)).toBe(true);

        elapse(15 * MINUTE_MS - SLEEP_TIMER_CHECK_MS);
        expect(pause).not.toHaveBeenCalled();
        expect(timer.getSnapshot().timer).not.toBeNull();

        elapse(SLEEP_TIMER_CHECK_MS);
        expect(pause).toHaveBeenCalledTimes(1);
        expect(player.getSnapshot().isPlaying).toBe(false);
        expect(timer.getSnapshot().timer).toBeNull();
    });

    it('should not restart playback after the timer fires', async () => {
        const { timer, audio } = await setup();
        timer.start(15);
        elapse(15 * MINUTE_MS);
        audio.play.mockClear();

        elapse(60 * MINUTE_MS);

        expect(audio.play).not.toHaveBeenCalled();
    });

    it('should keep counting while paused and only clear the timer at the deadline', async () => {
        const { timer, player, pause } = await setup();
        timer.start(30);
        player.pause();
        pause.mockClear();

        elapse(29 * MINUTE_MS);
        expect(timer.remainingMs(Date.now())).toBe(MINUTE_MS);

        elapse(MINUTE_MS);
        expect(timer.getSnapshot().timer).toBeNull();
        expect(pause).not.toHaveBeenCalled();
    });

    it('should start counting immediately even when nothing is playing', async () => {
        const { timer, pause } = await setup({ autoplay: false });
        timer.start(15);

        elapse(15 * MINUTE_MS);

        expect(timer.getSnapshot().timer).toBeNull();
        expect(pause).not.toHaveBeenCalled();
    });

    it('should keep counting across a track change', async () => {
        const { timer, player, pause } = await setup();
        timer.start(30);
        elapse(10 * MINUTE_MS);

        await player.load(NEXT, { autoplay: true });
        expect(timer.remainingMs(Date.now())).toBe(20 * MINUTE_MS);

        elapse(20 * MINUTE_MS);
        expect(pause).toHaveBeenCalledTimes(1);
    });

    it('should check the deadline on timeupdate when the interval is delayed', async () => {
        const { timer, audio, pause } = await setup();
        timer.start(15);
        // iOS 背景：interval 未行，但系統時間已經過咗截止時間
        vi.setSystemTime(START + 15 * MINUTE_MS);

        audio.emitTime(601);

        expect(pause).toHaveBeenCalledTimes(1);
        expect(timer.getSnapshot().timer).toBeNull();
    });

    it('should replace a running timer when another option is picked', async () => {
        const { timer } = await setup();
        timer.start(60);
        elapse(5 * MINUTE_MS);

        timer.start(15);

        expect(timer.remainingMs(Date.now())).toBe(15 * MINUTE_MS);
        expect(timer.getSnapshot().timer?.option).toBe(15);
    });

    it('should stop counting when cancelled', async () => {
        const { timer, pause } = await setup();
        timer.start(15);
        timer.cancel();

        elapse(20 * MINUTE_MS);

        expect(timer.getSnapshot().timer).toBeNull();
        expect(pause).not.toHaveBeenCalled();
        expect(sessionStorage.getItem(SLEEP_TIMER_STORAGE_KEY)).toBeNull();
    });

    it('should report the remaining fraction for the progress bar', async () => {
        const { timer } = await setup();
        expect(timer.fraction(Date.now())).toBe(0);
        expect(timer.remainingMs(Date.now())).toBe(0);
        timer.start(30);

        elapse(10 * MINUTE_MS);

        expect(timer.fraction(Date.now())).toBeCloseTo(2 / 3);
    });
});

describe('SleepTimerController end of episode', () => {
    it('should reject "end of episode" on a live stream', async () => {
        const { timer, audio } = await setup();
        audio.emitMetadata(Number.POSITIVE_INFINITY);

        expect(timer.episodeRemainingMs()).toBeUndefined();
        expect(timer.start('episode')).toBe(false);
        expect(timer.getSnapshot().timer).toBeNull();
        expect(localStorage.getItem(OLD_LAST_OPTION_KEY)).toBeNull();
    });

    it('should expose the remaining time of this episode for the menu', async () => {
        const { timer } = await setup();
        expect(timer.episodeRemainingMs()).toBe(10 * MINUTE_MS);
    });

    it('should stop when this episode ends instead of playing the next one', async () => {
        const { timer, audio, player } = await setup();
        expect(timer.start('episode')).toBe(true);

        audio.emitTime(DURATION - EARLY_ADVANCE_SECONDS / 2);
        expect(audio.src).toBe(EPISODE.url);

        audio.end();
        expect(audio.src).toBe(EPISODE.url);
        expect(player.getSnapshot().isPlaying).toBe(false);
        expect(timer.getSnapshot().timer).toBeNull();
    });

    it('should resume auto-advance after the timer is cancelled', async () => {
        const { timer, audio } = await setup();
        timer.start('episode');
        timer.cancel();

        audio.emitTime(DURATION - EARLY_ADVANCE_SECONDS / 2);

        expect(audio.src).toBe(NEXT.url);
    });

    it('should wait for the end of the episode even after the background deadline (paused)', async () => {
        const { timer, player, audio } = await setup();
        timer.start('episode');
        player.pause();

        elapse(30 * MINUTE_MS);
        expect(timer.getSnapshot().timer?.kind).toBe('episode');
        expect(timer.remainingMs(Date.now())).toBe(10 * MINUTE_MS);

        await player.play();
        audio.end();
        expect(timer.getSnapshot().timer).toBeNull();
    });

    it('should follow seeks on the same episode', async () => {
        const { timer, player } = await setup();
        timer.start('episode');

        player.seek(900);

        expect(timer.remainingMs(Date.now())).toBe(5 * MINUTE_MS);
    });

    it('should become a plain countdown with the original deadline on another episode', async () => {
        const { timer, player, audio, pause } = await setup();
        timer.start('episode');
        elapse(2 * MINUTE_MS);

        await player.load(NEXT, { autoplay: true });
        audio.emitMetadata(DURATION);

        const state = timer.getSnapshot().timer;
        expect(state?.kind).toBe('minutes');
        expect(state?.option).toBe('episode');
        expect(timer.remainingMs(Date.now())).toBe(8 * MINUTE_MS);

        // 轉咗集：唔再擋自動接下一集
        audio.emitTime(DURATION - EARLY_ADVANCE_SECONDS / 2);
        expect(audio.src).toBe(THIRD.url);
        expect(timer.getSnapshot().timer?.kind).toBe('minutes');

        elapse(8 * MINUTE_MS);
        expect(pause).toHaveBeenCalled();
        expect(timer.getSnapshot().timer).toBeNull();
    });

    it('should become a plain countdown when switching to a live stream', async () => {
        const live = recording('live');
        const { timer, player, audio } = await setup();
        timer.start('episode');

        await player.load(live, { autoplay: true });
        audio.emitMetadata(Number.POSITIVE_INFINITY);

        expect(timer.getSnapshot().timer?.kind).toBe('minutes');
        expect(timer.remainingMs(Date.now())).toBe(10 * MINUTE_MS);
    });

    it('should just clear the timer when switching after the background deadline passed', async () => {
        const { timer, player, pause } = await setup();
        timer.start('episode');
        player.pause();
        elapse(20 * MINUTE_MS);
        pause.mockClear();

        // 用戶啱啱撳播另一集：唔好即刻停佢
        await player.load(NEXT, { autoplay: true });

        expect(timer.getSnapshot().timer).toBeNull();
        expect(pause).not.toHaveBeenCalled();
    });

    it('should not block auto-advance when there is no timer', async () => {
        const { audio } = await setup();

        audio.emitTime(DURATION - EARLY_ADVANCE_SECONDS / 2);

        expect(audio.src).toBe(NEXT.url);
    });
});

describe('SleepTimerController storage', () => {
    it('should not remember a last option any more (replaced by the nightly schedule)', async () => {
        const { timer } = await setup();

        timer.start(30);
        timer.cancel();

        expect(timer.getSnapshot()).toEqual({ timer: null });
        expect(localStorage.getItem(OLD_LAST_OPTION_KEY)).toBeNull();
    });

    it('should keep counting after a reload in the same tab', async () => {
        const first = await setup();
        first.timer.start(30);
        elapse(10 * MINUTE_MS);
        cleanups.splice(0).forEach((cleanup) => cleanup());

        const { timer, pause } = await setup({ autoplay: false });

        expect(timer.getSnapshot().timer?.option).toBe(30);
        expect(timer.remainingMs(Date.now())).toBe(20 * MINUTE_MS);
        elapse(20 * MINUTE_MS);
        expect(timer.getSnapshot().timer).toBeNull();
        expect(pause).not.toHaveBeenCalled();
    });

    it('should drop an expired timer on reload without playing', async () => {
        const first = await setup();
        first.timer.start(15);
        cleanups.splice(0).forEach((cleanup) => cleanup());
        vi.setSystemTime(START + 16 * MINUTE_MS);

        const { timer, audio } = await setup({ autoplay: false });

        expect(timer.getSnapshot().timer).toBeNull();
        expect(sessionStorage.getItem(SLEEP_TIMER_STORAGE_KEY)).toBeNull();
        expect(audio.play).not.toHaveBeenCalled();
    });

    it('should keep "end of episode" after a reload once the same episode is loaded again', async () => {
        const first = await setup();
        first.timer.start('episode');
        cleanups.splice(0).forEach((cleanup) => cleanup());

        const { timer, audio } = await setup();

        expect(timer.getSnapshot().timer?.kind).toBe('episode');
        audio.end();
        expect(audio.src).toBe(EPISODE.url);
        expect(timer.getSnapshot().timer).toBeNull();
    });

    it('should keep waiting for the end of the same episode after a reload past the background deadline (S-1180)', async () => {
        const first = await setup();
        first.timer.start('episode');
        first.player.pause();
        cleanups.splice(0).forEach((cleanup) => cleanup());
        vi.setSystemTime(START + 30 * MINUTE_MS);

        const { timer, audio, pause } = await setup({ autoplay: false });

        expect(timer.getSnapshot().timer?.kind).toBe('episode');
        expect(pause).not.toHaveBeenCalled();
        audio.end();
        expect(audio.src).toBe(EPISODE.url);
        expect(timer.getSnapshot().timer).toBeNull();
    });

    it('should just clear a reloaded "end of episode" timer past its deadline when that episode is not loaded', async () => {
        const first = await setup();
        first.timer.start('episode');
        cleanups.splice(0).forEach((cleanup) => cleanup());
        vi.setSystemTime(START + 30 * MINUTE_MS);

        const audio = new FakeAudio();
        const player = new AudioController(audio.asAudio());
        cleanups.push(player.attach());
        const pause = vi.spyOn(player, 'pause');
        const timer = new SleepTimerController(player);
        expect(timer.getSnapshot().timer?.kind).toBe('episode');
        cleanups.push(timer.attach());

        expect(timer.getSnapshot().timer).toBeNull();
        expect(sessionStorage.getItem(SLEEP_TIMER_STORAGE_KEY)).toBeNull();
        expect(pause).not.toHaveBeenCalled();
        expect(audio.play).not.toHaveBeenCalled();
    });

    it('should keep working when storage throws', async () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        const { timer, pause } = await setup();

        expect(timer.start(15)).toBe(true);
        elapse(15 * MINUTE_MS);

        expect(pause).toHaveBeenCalledTimes(1);
    });
});

describe('SleepTimerController subscription', () => {
    it('should notify only on timer changes, not on every tick', async () => {
        const { timer } = await setup();
        const listener = vi.fn();
        cleanups.push(timer.subscribe(listener));

        timer.start(15);
        expect(listener).toHaveBeenCalledTimes(1);

        elapse(10 * MINUTE_MS);
        expect(listener).toHaveBeenCalledTimes(1);

        elapse(5 * MINUTE_MS);
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should stop checking after detach', async () => {
        const audio = new FakeAudio();
        const player = new AudioController(audio.asAudio());
        cleanups.push(player.attach());
        const timer = new SleepTimerController(player);
        const detach = timer.attach();
        timer.start(15);
        detach();

        elapse(15 * MINUTE_MS);

        expect(timer.getSnapshot().timer).not.toBeNull();
    });
});
