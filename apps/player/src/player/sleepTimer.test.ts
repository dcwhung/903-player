import { MS_PER_SECOND } from '../config/constants';
import {
    createSleepTimer,
    episodeRemainingMs,
    followEpisode,
    fraction,
    isExpired,
    isNightWindow,
    isSleepTimerOption,
    remainingMs,
    type EpisodePosition,
    type SleepTimerState,
} from './sleepTimer';

const MINUTE_MS = 60 * MS_PER_SECOND;
const NOW = 1_000_000;
const EPISODE_ID = 'id:episode-1';
/** 一集 20 分鐘，播到 10 分鐘：剩 10 分鐘 */
const POSITION: EpisodePosition = { id: EPISODE_ID, currentTime: 600, duration: 1200 };

/** 裝置本地時間（new Date(y, m, d, h, min) 係本地時區） */
const localTime = (hour: number, minute: number, second = 0): Date =>
    new Date(2026, 10, 30, hour, minute, second);

describe('isNightWindow', () => {
    it.each([
        [20, 59, 59, false],
        [21, 0, 0, true],
        [23, 59, 59, true],
        [0, 0, 0, true],
        [4, 59, 59, true],
        [5, 0, 0, false],
        [14, 0, 0, false],
    ])('should treat %i:%i:%i local time as night = %s', (hour, minute, second, expected) => {
        expect(isNightWindow(localTime(hour, minute, second))).toBe(expected);
    });
});

describe('isSleepTimerOption', () => {
    it.each([15, 30, 60, 'episode'])('should accept %s', (value) => {
        expect(isSleepTimerOption(value)).toBe(true);
    });

    it.each([0, 45, '15', 'minutes', null, undefined, {}])('should reject %s', (value) => {
        expect(isSleepTimerOption(value)).toBe(false);
    });
});

describe('episodeRemainingMs', () => {
    it('should return the remaining playback time of the episode in ms', () => {
        expect(episodeRemainingMs(POSITION)).toBe(10 * MINUTE_MS);
    });

    it('should return undefined for a live stream (infinite duration)', () => {
        expect(
            episodeRemainingMs({ ...POSITION, duration: Number.POSITIVE_INFINITY }),
        ).toBeUndefined();
    });

    it('should return undefined before metadata arrives', () => {
        expect(episodeRemainingMs({ ...POSITION, duration: 0 })).toBeUndefined();
        expect(episodeRemainingMs({ ...POSITION, duration: Number.NaN })).toBeUndefined();
    });

    it('should return undefined when parked at the end', () => {
        expect(episodeRemainingMs({ ...POSITION, currentTime: 1200 })).toBeUndefined();
    });

    it('should return undefined when nothing is loaded', () => {
        expect(episodeRemainingMs(null)).toBeUndefined();
    });
});

describe('createSleepTimer', () => {
    it('should start a minutes countdown from now', () => {
        expect(createSleepTimer(30, NOW, null)).toEqual({
            kind: 'minutes',
            option: 30,
            startedAt: NOW,
            deadline: NOW + 30 * MINUTE_MS,
        });
    });

    it('should start a minutes countdown even while a live stream is loaded', () => {
        const live = { ...POSITION, duration: Number.POSITIVE_INFINITY };
        expect(createSleepTimer(15, NOW, live)?.deadline).toBe(NOW + 15 * MINUTE_MS);
    });

    it('should use the remaining time of this episode as the background deadline', () => {
        expect(createSleepTimer('episode', NOW, POSITION)).toEqual({
            kind: 'episode',
            option: 'episode',
            startedAt: NOW,
            deadline: NOW + 10 * MINUTE_MS,
            episodeId: EPISODE_ID,
        });
    });

    it('should reject "end of episode" while a live stream is playing', () => {
        const live = { ...POSITION, duration: Number.POSITIVE_INFINITY };
        expect(createSleepTimer('episode', NOW, live)).toBeNull();
    });

    it('should reject "end of episode" when nothing is loaded', () => {
        expect(createSleepTimer('episode', NOW, null)).toBeNull();
    });
});

describe('followEpisode', () => {
    const episodeTimer = createSleepTimer('episode', NOW, POSITION) as SleepTimerState;

    it('should keep the episode mode while the same episode is loaded', () => {
        expect(followEpisode(episodeTimer, EPISODE_ID)).toBe(episodeTimer);
    });

    it('should keep the episode mode while nothing is loaded (e.g. after a reload)', () => {
        expect(followEpisode(episodeTimer, undefined)).toBe(episodeTimer);
    });

    it('should become a plain countdown with the original deadline on another episode', () => {
        expect(followEpisode(episodeTimer, 'id:episode-2')).toEqual({
            kind: 'minutes',
            option: 'episode',
            startedAt: NOW,
            deadline: episodeTimer.deadline,
        });
    });

    it('should leave a minutes timer untouched', () => {
        const minutes = createSleepTimer(60, NOW, null) as SleepTimerState;
        expect(followEpisode(minutes, 'id:episode-2')).toBe(minutes);
    });
});

describe('remainingMs / fraction', () => {
    const minutes = createSleepTimer(30, NOW, null) as SleepTimerState;
    const episode = createSleepTimer('episode', NOW, POSITION) as SleepTimerState;

    it('should count down the minutes timer from the absolute deadline', () => {
        expect(remainingMs(minutes, NOW + 10 * MINUTE_MS)).toBe(20 * MINUTE_MS);
        expect(fraction(minutes, NOW + 10 * MINUTE_MS)).toBeCloseTo(2 / 3);
    });

    it('should report the full time at the start', () => {
        expect(remainingMs(minutes, NOW)).toBe(30 * MINUTE_MS);
        expect(fraction(minutes, NOW)).toBe(1);
    });

    it('should report 0 for a zero-length timer instead of dividing by zero', () => {
        const empty: SleepTimerState = { ...minutes, deadline: minutes.startedAt };
        expect(fraction(empty, NOW)).toBe(0);
    });

    it('should never go below zero after the deadline', () => {
        expect(remainingMs(minutes, NOW + 31 * MINUTE_MS)).toBe(0);
        expect(fraction(minutes, NOW + 31 * MINUTE_MS)).toBe(0);
    });

    it('should follow the playback position on the same episode', () => {
        // 暫停咗 5 分鐘：位置冇行，播完呢集仲係剩 10 分鐘
        expect(remainingMs(episode, NOW + 5 * MINUTE_MS, POSITION)).toBe(10 * MINUTE_MS);
        // seek 前咗：剩 5 分鐘
        const seeked = { ...POSITION, currentTime: 900 };
        expect(remainingMs(episode, NOW, seeked)).toBe(5 * MINUTE_MS);
        expect(fraction(episode, NOW, seeked)).toBeCloseTo(0.5);
    });

    it('should cap the fraction at 1 when seeking back on the same episode', () => {
        const rewound = { ...POSITION, currentTime: 0 };
        expect(remainingMs(episode, NOW, rewound)).toBe(20 * MINUTE_MS);
        expect(fraction(episode, NOW, rewound)).toBe(1);
    });

    it('should fall back to the deadline when another episode is loaded', () => {
        const other = { ...POSITION, id: 'id:episode-2', currentTime: 0 };
        expect(remainingMs(episode, NOW + 4 * MINUTE_MS, other)).toBe(6 * MINUTE_MS);
    });

    it('should fall back to the deadline when the position is unknown', () => {
        expect(remainingMs(episode, NOW + 4 * MINUTE_MS)).toBe(6 * MINUTE_MS);
    });
});

describe('isExpired', () => {
    const minutes = createSleepTimer(15, NOW, null) as SleepTimerState;
    const episode = createSleepTimer('episode', NOW, POSITION) as SleepTimerState;

    it('should expire a minutes timer exactly at the deadline', () => {
        expect(isExpired(minutes, minutes.deadline - 1, EPISODE_ID)).toBe(false);
        expect(isExpired(minutes, minutes.deadline, EPISODE_ID)).toBe(true);
    });

    it('should never expire by time while staying on the same episode', () => {
        expect(isExpired(episode, episode.deadline + MINUTE_MS, EPISODE_ID)).toBe(false);
    });

    it('should expire an episode timer by its deadline when another track is loaded', () => {
        expect(isExpired(episode, episode.deadline, 'id:episode-2')).toBe(true);
    });

    it('should expire an episode timer by its deadline when nothing is loaded', () => {
        expect(isExpired(episode, episode.deadline, undefined)).toBe(true);
    });
});
