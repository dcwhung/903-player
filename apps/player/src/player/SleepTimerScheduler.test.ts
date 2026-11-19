import { FakeAudio } from '../../tests/fakeAudio';
import { SLEEP_TIMER_CHECK_MS, SLEEP_TIMER_SCHEDULE_STORAGE_KEY } from '../config/constants';
import type { Recording } from '../types/recording';
import { AudioController } from './AudioController';
import { SleepTimerController } from './SleepTimerController';
import { SleepTimerScheduler } from './SleepTimerScheduler';

const MINUTE_MS = 60_000;
/** 裝置本地時間 */
const at = (day: number, hour: number, minute: number) =>
    new Date(2026, 10, day, hour, minute).getTime();

const EPISODE: Recording = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2308',
    id: 'id:episode',
    url: 'https://audio.hkfm903.live/episode.aac',
};
const LIVE_DURATION = Infinity;
const DURATION = 1200;

const cleanups: (() => void)[] = [];

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(at(29, 23, 12));
});

afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    vi.useRealTimers();
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
});

const setup = () => {
    const audio = new FakeAudio();
    const player = new AudioController(audio.asAudio());
    cleanups.push(player.attach());
    const timer = new SleepTimerController(player);
    cleanups.push(timer.attach());
    const scheduler = new SleepTimerScheduler(timer, player);
    cleanups.push(scheduler.attach());
    const autoStarts: unknown[] = [];
    cleanups.push(scheduler.onAutoStart((option) => autoStarts.push(option)));
    const play = async (duration = DURATION) => {
        await player.load(EPISODE, { autoplay: true });
        audio.emitMetadata(duration);
        audio.emitTime(1);
        audio.emitPlaying();
        await Promise.resolve();
    };
    return { audio, player, timer, scheduler, autoStarts, play };
};

/** 由而家行到某個本地時間（每秒 interval 照跑） */
const runUntil = (time: number) => vi.advanceTimersByTime(time - Date.now());

/** 23:12 手動揀 30 分鐘 → 每晚 23:10；之後播停咗 */
const scheduleTonight = async (option: 30 | 'episode' = 30) => {
    const env = setup();
    await env.play();
    expect(env.scheduler.pick(option)).toBe(true);
    env.timer.cancel();
    env.player.pause();
    return env;
};

describe('SleepTimerScheduler', () => {
    it('should record a manual pick as a nightly schedule rounded to 5 minutes', async () => {
        const { scheduler, timer } = await scheduleTonight();

        expect(scheduler.getSnapshot()).toEqual({
            minuteOfDay: 23 * 60 + 10,
            option: 30,
            firedFor: at(29, 23, 10),
        });
        expect(JSON.parse(localStorage.getItem(SLEEP_TIMER_SCHEDULE_STORAGE_KEY) ?? '')).toEqual(
            scheduler.getSnapshot(),
        );
        expect(timer.getSnapshot().timer).toBeNull();
    });

    it('should not fire again tonight after the manual pick (even if playback restarts in the window)', async () => {
        const { autoStarts, player, timer } = await scheduleTonight();

        await player.play();
        vi.advanceTimersByTime(10 * MINUTE_MS);

        expect(autoStarts).toEqual([]);
        expect(timer.getSnapshot().timer).toBeNull();
    });

    it('should start the timer at the scheduled time the next night when something is playing', async () => {
        const { autoStarts, player, timer } = await scheduleTonight();
        runUntil(at(30, 22, 0));
        await player.play();

        runUntil(at(30, 23, 10) - SLEEP_TIMER_CHECK_MS);
        expect(timer.getSnapshot().timer).toBeNull();
        runUntil(at(30, 23, 10));

        expect(autoStarts).toEqual([30]);
        expect(timer.getSnapshot().timer).toMatchObject({
            option: 30,
            startedAt: at(30, 23, 10),
            deadline: at(30, 23, 40),
        });
    });

    it('should wait for playback in the window and count from when it starts', async () => {
        const { autoStarts, player, timer } = await scheduleTonight();
        runUntil(at(31, 0, 5));
        expect(autoStarts).toEqual([]);

        await player.play();

        expect(autoStarts).toEqual([30]);
        expect(timer.getSnapshot().timer?.startedAt).toBe(at(31, 0, 5));
    });

    it('should do nothing when playback only starts after the 3 hour window', async () => {
        const { autoStarts, player } = await scheduleTonight();
        runUntil(at(31, 2, 10));

        await player.play();
        vi.advanceTimersByTime(MINUTE_MS);

        expect(autoStarts).toEqual([]);
    });

    it('should fire at most once a night', async () => {
        const { autoStarts, player, timer } = await scheduleTonight();
        runUntil(at(30, 23, 0));
        await player.play();
        runUntil(at(30, 23, 41));
        expect(timer.getSnapshot().timer).toBeNull();

        await player.play();
        runUntil(at(30, 23, 50));

        expect(autoStarts).toEqual([30]);
        expect(timer.getSnapshot().timer).toBeNull();
    });

    it('should not override a timer already running at the scheduled time, and count the night as used', async () => {
        const { autoStarts, player, timer } = await scheduleTonight();
        runUntil(at(30, 23, 0));
        await player.play();
        timer.start(60);
        runUntil(at(30, 23, 11));
        expect(timer.getSnapshot().timer?.option).toBe(60);

        timer.cancel();
        await player.play();
        runUntil(at(30, 23, 20));

        expect(autoStarts).toEqual([]);
        expect(timer.getSnapshot().timer).toBeNull();
    });

    it('should replace the schedule with a new manual pick', async () => {
        const { scheduler, player } = await scheduleTonight();
        runUntil(at(30, 21, 3));
        await player.play();

        scheduler.pick(15);

        expect(scheduler.getSnapshot()).toMatchObject({ minuteOfDay: 21 * 60 + 5, option: 15 });
    });

    it('should clear the schedule', async () => {
        const { scheduler, autoStarts, player } = await scheduleTonight();

        scheduler.clear();
        runUntil(at(30, 23, 0));
        await player.play();
        runUntil(at(30, 23, 20));

        expect(scheduler.getSnapshot()).toBeNull();
        expect(localStorage.getItem(SLEEP_TIMER_SCHEDULE_STORAGE_KEY)).toBeNull();
        expect(autoStarts).toEqual([]);
    });

    it('should not fire "end of episode" while live is playing, but fire once an episode plays in the window', async () => {
        const { autoStarts, player, audio, timer } = await scheduleTonight('episode');
        runUntil(at(30, 23, 0));
        await player.load(EPISODE, { autoplay: true });
        audio.emitMetadata(LIVE_DURATION);
        audio.emitPlaying();
        runUntil(at(30, 23, 15));
        expect(autoStarts).toEqual([]);

        audio.emitMetadata(DURATION);
        audio.emitTime(1);

        expect(autoStarts).toEqual(['episode']);
        expect(timer.getSnapshot().timer?.kind).toBe('episode');
    });

    it('should remember a fired night across a reload', async () => {
        const first = await scheduleTonight();
        runUntil(at(30, 23, 0));
        await first.player.play();
        runUntil(at(30, 23, 10));
        expect(first.autoStarts).toEqual([30]);
        first.timer.cancel();
        cleanups.splice(0).forEach((cleanup) => cleanup());
        sessionStorage.clear();

        const reloaded = setup();
        await reloaded.play();
        runUntil(at(30, 23, 20));

        expect(reloaded.autoStarts).toEqual([]);
    });

    it('should ignore broken stored data', () => {
        localStorage.setItem(SLEEP_TIMER_SCHEDULE_STORAGE_KEY, '{"minuteOfDay":9999,"option":7}');

        expect(setup().scheduler.getSnapshot()).toBeNull();
    });

    it('should keep working when storage throws', async () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const { scheduler, play } = setup();
        await play();

        expect(scheduler.pick(15)).toBe(true);
        expect(scheduler.getSnapshot()?.option).toBe(15);
    });
});
