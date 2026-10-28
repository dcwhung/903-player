import { REPLAY_RESET_SECONDS } from '../config/constants';
import { ReplayTracker } from './replayTracker';

// 模擬瀏覽器每 0.25 秒發一次 timeupdate
const TICK_SECONDS = 0.25;

/** 由 from 播到 to，返回邊幾個位置 track() 報夠鐘 */
const playThrough = (tracker: ReplayTracker, from: number, to: number, paused = false) => {
    const reached: number[] = [];
    for (let t = from; t <= to; t += TICK_SECONDS) {
        if (tracker.track(t, paused)) {
            reached.push(t);
        }
    }
    return reached;
};

const armedTracker = () => {
    const tracker = new ReplayTracker();
    tracker.arm(true);
    return tracker;
};

describe('ReplayTracker', () => {
    it('should not count anything before it is armed', () => {
        const tracker = new ReplayTracker();
        expect(playThrough(tracker, 0, REPLAY_RESET_SECONDS * 2)).toEqual([]);
    });

    it('should not count when armed for an unwatched recording', () => {
        const tracker = new ReplayTracker();
        tracker.arm(false);
        expect(playThrough(tracker, 0, REPLAY_RESET_SECONDS * 2)).toEqual([]);
    });

    it('should report once when replay time reaches the threshold', () => {
        const tracker = armedTracker();
        expect(playThrough(tracker, 0, REPLAY_RESET_SECONDS * 3)).toEqual([REPLAY_RESET_SECONDS]);
    });

    it('should not report just short of the threshold', () => {
        const tracker = armedTracker();
        expect(playThrough(tracker, 0, REPLAY_RESET_SECONDS - TICK_SECONDS)).toEqual([]);
    });

    it('should not count time while paused', () => {
        const tracker = armedTracker();
        expect(playThrough(tracker, 0, REPLAY_RESET_SECONDS * 2, true)).toEqual([]);
    });

    it('should not count a backwards jump', () => {
        const tracker = armedTracker();
        playThrough(tracker, 0, REPLAY_RESET_SECONDS / 2);
        expect(tracker.track(0, false)).toBe(false);
        // 倒退之後由 0 重新累計，前面嘅一半仲喺度
        expect(playThrough(tracker, TICK_SECONDS, REPLAY_RESET_SECONDS / 2)).toEqual([
            REPLAY_RESET_SECONDS / 2,
        ]);
    });

    it('should not count a jump after moveTo', () => {
        const tracker = armedTracker();
        const seekTarget = REPLAY_RESET_SECONDS * 30;
        playThrough(tracker, 0, 1);

        tracker.moveTo(seekTarget);

        expect(tracker.track(seekTarget + TICK_SECONDS, false)).toBe(false);
        expect(playThrough(tracker, seekTarget, seekTarget + REPLAY_RESET_SECONDS - 2)).toEqual([]);
    });

    it('should count the jump from the last tick when there was no moveTo', () => {
        // 冇 moveTo 嘅向前跳會當收聽時間：所以 seek / 換集 / 重新載入一定要叫 moveTo
        const tracker = armedTracker();
        tracker.track(0, false);
        expect(tracker.track(REPLAY_RESET_SECONDS, false)).toBe(true);
    });

    it('should keep the last tick position while paused', () => {
        const tracker = armedTracker();
        tracker.track(0, false);
        tracker.track(REPLAY_RESET_SECONDS * 2, true);
        expect(tracker.track(REPLAY_RESET_SECONDS * 2 + TICK_SECONDS, false)).toBe(false);
    });

    it('should start counting from zero when re-armed', () => {
        const tracker = armedTracker();
        playThrough(tracker, 0, REPLAY_RESET_SECONDS - 1);

        tracker.arm(true);

        expect(playThrough(tracker, REPLAY_RESET_SECONDS, REPLAY_RESET_SECONDS + 2)).toEqual([]);
    });

    it('should stop counting when re-armed for an unwatched recording', () => {
        const tracker = armedTracker();
        playThrough(tracker, 0, REPLAY_RESET_SECONDS - 1);

        tracker.arm(false);

        expect(playThrough(tracker, REPLAY_RESET_SECONDS, REPLAY_RESET_SECONDS * 2)).toEqual([]);
    });
});
