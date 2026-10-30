import {
    STALL_DATA_AHEAD_SECONDS,
    STALL_FIRST_RETRY_MS,
    STALL_HIDDEN_MARK_MS,
    STALL_MAX_RETRIES,
    STALL_MAX_WAIT_MS,
    STALL_PROGRESS_RECHECK_MS,
    STALL_RETRY_MS,
} from '../config/constants';
import type { LoadProbe } from './loadProgress';
import { StallWatchdog } from './stallWatchdog';

/** 冇下載進展（buffer / readyState / progress 唔變）：每次到期都當卡住 */
const idleProbe = (): LoadProbe => ({
    bufferedEnd: undefined,
    readyState: 0,
    currentTime: 0,
    playingFired: false,
    progressEvents: 0,
});

const setup = (canRetry = true) => {
    const retry = vi.fn<(retriesLeft: number) => void>();
    const allow = vi.fn(() => canRetry);
    const onStalled = vi.fn();
    const probe = vi.fn(idleProbe);
    // 預設前景（亮屏）；鎖屏測試改返 true
    const isHidden = vi.fn(() => false);
    // 預設未發 playing / 冇凍結；pipeline 死咗嘅測試改返 true（v1.20.9）
    const isFrozenPlaying = vi.fn(() => false);
    const watchdog = new StallWatchdog({
        canRetry: allow,
        retry,
        onStalled,
        probe,
        isHidden,
        isFrozenPlaying,
    });
    return { watchdog, retry, allow, onStalled, probe, isHidden, isFrozenPlaying };
};

/** 慢網：每次問都多咗少少數據，但前面數據仲未夠 */
const growingProbe = (aheadSeconds = 1) => {
    let end = 0;
    return (): LoadProbe => {
        end += aheadSeconds;
        return {
            bufferedEnd: end,
            readyState: 2,
            currentTime: end - aheadSeconds,
            playingFired: false,
            progressEvents: 0,
        };
    };
};

describe('StallWatchdog', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('should not be pending before watching', () => {
        const { watchdog } = setup();
        expect(watchdog.pending).toBe(false);
    });

    it('should be pending while watching', () => {
        const { watchdog } = setup();
        watchdog.watch(STALL_MAX_RETRIES);
        expect(watchdog.pending).toBe(true);
    });

    it('should retry with the retries left when the timer fires', () => {
        const { watchdog, retry } = setup();
        watchdog.watch(STALL_MAX_RETRIES);

        vi.advanceTimersByTime(STALL_RETRY_MS - 1);
        expect(retry).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);

        expect(retry).toHaveBeenCalledExactlyOnceWith(STALL_MAX_RETRIES);
        expect(watchdog.pending).toBe(true);
    });

    it('should count down and give up after the retry limit', () => {
        const { watchdog, retry } = setup();
        watchdog.watch(STALL_MAX_RETRIES);

        vi.advanceTimersByTime(STALL_RETRY_MS * (STALL_MAX_RETRIES + 2));

        const expected = Array.from({ length: STALL_MAX_RETRIES }, (_, i) => [
            STALL_MAX_RETRIES - i,
        ]);
        expect(retry.mock.calls).toEqual(expected);
        expect(watchdog.pending).toBe(false);
    });

    it('should not retry after cancel', () => {
        const { watchdog, retry } = setup();
        watchdog.watch(STALL_MAX_RETRIES);

        watchdog.cancel();
        vi.advanceTimersByTime(STALL_RETRY_MS * STALL_MAX_RETRIES);

        expect(retry).not.toHaveBeenCalled();
        expect(watchdog.pending).toBe(false);
    });

    it('should give up for good when a retry is no longer wanted', () => {
        const { watchdog, retry, allow } = setup(false);
        watchdog.watch(STALL_MAX_RETRIES);

        vi.advanceTimersByTime(STALL_RETRY_MS);
        allow.mockReturnValue(true);
        vi.advanceTimersByTime(STALL_RETRY_MS * STALL_MAX_RETRIES);

        expect(retry).not.toHaveBeenCalled();
        expect(watchdog.pending).toBe(false);
    });

    it('should retry straight away and restart the timer on retryNow', () => {
        const { watchdog, retry } = setup();
        watchdog.watch(STALL_MAX_RETRIES);
        vi.advanceTimersByTime(STALL_RETRY_MS / 2);

        watchdog.retryNow();
        expect(retry).toHaveBeenLastCalledWith(STALL_MAX_RETRIES);
        vi.advanceTimersByTime(STALL_RETRY_MS / 2);
        expect(retry).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(STALL_RETRY_MS / 2);

        expect(retry).toHaveBeenLastCalledWith(STALL_MAX_RETRIES - 1);
    });

    it('should do nothing on retryNow when not watching', () => {
        const { watchdog, retry, allow } = setup();

        watchdog.retryNow();

        expect(retry).not.toHaveBeenCalled();
        expect(allow).not.toHaveBeenCalled();
        expect(watchdog.pending).toBe(false);
    });

    it('should restart the count when watched again', () => {
        const { watchdog, retry } = setup();
        watchdog.watch(1);
        watchdog.watch(STALL_MAX_RETRIES);

        vi.advanceTimersByTime(STALL_RETRY_MS * (STALL_MAX_RETRIES + 2));

        expect(retry).toHaveBeenCalledTimes(STALL_MAX_RETRIES);
    });

    it('should re-arm after the retry callback even if it cancelled', () => {
        // 同原本次序一樣：先 load + play，之後先排下一次
        const { watchdog, retry } = setup();
        retry.mockImplementationOnce(() => watchdog.cancel());
        watchdog.watch(STALL_MAX_RETRIES);

        vi.advanceTimersByTime(STALL_RETRY_MS);

        expect(watchdog.pending).toBe(true);
    });

    it('should retry after the shorter first timeout when started', () => {
        const { watchdog, retry } = setup();
        watchdog.start(STALL_MAX_RETRIES);

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS - 1);
        expect(retry).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(retry).toHaveBeenCalledExactlyOnceWith(STALL_MAX_RETRIES);

        vi.advanceTimersByTime(STALL_RETRY_MS);
        expect(retry).toHaveBeenLastCalledWith(STALL_MAX_RETRIES - 1);
    });

    it('should keep the running count and timer when started while already watching', () => {
        // 重試入面嘅 play() 會再 start：唔可以補返次數，亦唔可以推遲 timer
        const { watchdog, retry } = setup();
        watchdog.start(STALL_MAX_RETRIES);
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS - 1);

        watchdog.start(STALL_MAX_RETRIES);
        vi.advanceTimersByTime(1);

        expect(retry).toHaveBeenCalledExactlyOnceWith(STALL_MAX_RETRIES);
    });

    it('should not be overdue before the deadline', () => {
        const { watchdog } = setup();
        watchdog.start(STALL_MAX_RETRIES);

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS - 1);

        expect(watchdog.overdue).toBe(false);
    });

    it('should be overdue once the deadline passes while the timer is frozen', () => {
        // iOS 鎖屏暫停 JS：timer 冇行，但 wall clock 照行
        const { watchdog, retry } = setup();
        watchdog.start(STALL_MAX_RETRIES);

        vi.setSystemTime(Date.now() + STALL_FIRST_RETRY_MS);

        expect(retry).not.toHaveBeenCalled();
        expect(watchdog.overdue).toBe(true);
    });

    it('should not be overdue when not watching', () => {
        const { watchdog } = setup();
        watchdog.start(STALL_MAX_RETRIES);
        vi.setSystemTime(Date.now() + STALL_FIRST_RETRY_MS);

        watchdog.cancel();

        expect(watchdog.overdue).toBe(false);
    });

    it('should not retry on wake-up before the deadline', () => {
        // C-009：撳播之後即刻切 app / 鎖屏再開，正常載緊唔好 reload
        const { watchdog, retry } = setup();
        watchdog.start(STALL_MAX_RETRIES);
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS / 4);

        watchdog.retryIfOverdue();

        expect(retry).not.toHaveBeenCalled();
        expect(watchdog.pending).toBe(true);
    });

    it('should retry once on wake-up when the deadline passed while the timer was frozen', () => {
        const { watchdog, retry } = setup();
        watchdog.start(STALL_MAX_RETRIES);
        vi.setSystemTime(Date.now() + STALL_FIRST_RETRY_MS);

        watchdog.retryIfOverdue();
        // 被凍結嘅舊 timer 已經由新一輪取代，唔會再補一次
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

        expect(retry).toHaveBeenCalledExactlyOnceWith(STALL_MAX_RETRIES);
    });

    it('should skip a wake-up retry right after a late timer retried', () => {
        // S-551 情境 1：遲咗嘅 timer 先行，65 ms 後亮屏
        const WAKE_AFTER_TIMER_MS = 65;
        const { watchdog, retry } = setup();
        watchdog.start(STALL_MAX_RETRIES);
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS + WAKE_AFTER_TIMER_MS);

        watchdog.retryIfOverdue();

        expect(retry).toHaveBeenCalledTimes(1);
        expect(watchdog.pending).toBe(true);
    });

    it('should report a stall before retrying once a deadline passes', () => {
        const { watchdog, retry, onStalled } = setup();
        retry.mockImplementation(() => expect(onStalled).toHaveBeenCalledTimes(1));
        watchdog.start(STALL_MAX_RETRIES);

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS - 1);
        expect(onStalled).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);

        expect(onStalled).toHaveBeenCalledTimes(1);
        expect(retry).toHaveBeenCalledTimes(1);
    });

    it('should not report a stall when no longer wanted or cancelled', () => {
        const { watchdog, onStalled } = setup(false);
        watchdog.start(STALL_MAX_RETRIES);
        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);
        watchdog.start(STALL_MAX_RETRIES);
        watchdog.cancel();
        vi.advanceTimersByTime(STALL_RETRY_MS);

        expect(onStalled).not.toHaveBeenCalled();
    });

    // W-498：慢網開播，下載有進展就唔好 reload
    it('should re-arm without spending a retry while the load is progressing', () => {
        const { watchdog, retry, probe, onStalled } = setup();
        probe.mockImplementation(growingProbe());
        watchdog.start(STALL_MAX_RETRIES);

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);
        expect(retry).not.toHaveBeenCalled();
        expect(onStalled).not.toHaveBeenCalled();
        expect(watchdog.overdue).toBe(false);

        // 之後冇再增長：下一次到期就重試，次數冇扣過
        probe.mockImplementation(idleProbe);
        vi.advanceTimersByTime(STALL_PROGRESS_RECHECK_MS * 2);
        expect(retry).toHaveBeenCalledExactlyOnceWith(STALL_MAX_RETRIES);
    });

    it('should retry when data is buffered ahead but the position is frozen', () => {
        const { watchdog, retry, probe } = setup();
        probe.mockImplementation(growingProbe(STALL_DATA_AHEAD_SECONDS + 1));
        watchdog.start(STALL_MAX_RETRIES);

        vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

        expect(retry).toHaveBeenCalledExactlyOnceWith(STALL_MAX_RETRIES);
    });

    it('should stop waiting for a progressing load after the total cap', () => {
        const { watchdog, retry, probe } = setup();
        probe.mockImplementation(growingProbe());
        watchdog.start(STALL_MAX_RETRIES);

        vi.advanceTimersByTime(STALL_MAX_WAIT_MS - 1);
        expect(retry).not.toHaveBeenCalled();
        // S-582：剛好喺上限重試，唔會因為 recheck 排咗喺上限之後而多等
        vi.advanceTimersByTime(1);

        expect(retry).toHaveBeenCalledExactlyOnceWith(STALL_MAX_RETRIES);
    });

    it('should keep waiting on wake-up when the load progressed while frozen', () => {
        const { watchdog, retry, probe } = setup();
        probe.mockImplementation(growingProbe());
        watchdog.start(STALL_MAX_RETRIES);
        vi.setSystemTime(Date.now() + STALL_FIRST_RETRY_MS);

        watchdog.retryIfOverdue();

        expect(retry).not.toHaveBeenCalled();
        expect(watchdog.overdue).toBe(false);
    });

    /**
     * v1.20.8：鎖屏（document hidden）時 iOS 由 loadstart 到 loadeddata 要 ~4.3 s；喺 4 s reload 會 abort 佢，
     * 之後 iOS 喺背景再唔載完。鎖屏時永遠唔自動 reload，等亮屏（retryIfOverdue）或者鎖屏 Play（resume）
     */
    describe('while the page is hidden', () => {
        it('should not retry or report a stall when the first deadline passes', () => {
            const { watchdog, retry, onStalled, isHidden } = setup();
            isHidden.mockReturnValue(true);
            watchdog.start(STALL_MAX_RETRIES);

            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

            expect(retry).not.toHaveBeenCalled();
            expect(onStalled).not.toHaveBeenCalled();
            expect(watchdog.pending).toBe(true);
            // deadline 過咗：亮屏 / 鎖屏 Play 照樣當懷疑卡住
            expect(watchdog.overdue).toBe(true);
        });

        it('should never spend a retry however long it stays hidden', () => {
            const LOCKED_MS = 77_000;
            const { watchdog, retry, isHidden } = setup();
            isHidden.mockReturnValue(true);
            watchdog.start(STALL_MAX_RETRIES);

            vi.advanceTimersByTime(LOCKED_MS);

            expect(retry).not.toHaveBeenCalled();
            expect(watchdog.pending).toBe(true);
            expect(watchdog.overdue).toBe(true);
        });

        it('should report a stall only after the hidden grace from the attempt start', () => {
            const { watchdog, onStalled, isHidden } = setup();
            isHidden.mockReturnValue(true);
            watchdog.start(STALL_MAX_RETRIES);

            vi.advanceTimersByTime(STALL_HIDDEN_MARK_MS - 1);
            expect(onStalled).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1);

            expect(onStalled).toHaveBeenCalledTimes(1);
        });

        it('should spend the first retry once the screen wakes up past the deadline', () => {
            const LOCKED_MS = 77_000;
            const { watchdog, retry, isHidden } = setup();
            isHidden.mockReturnValue(true);
            watchdog.start(STALL_MAX_RETRIES);
            vi.advanceTimersByTime(LOCKED_MS);

            isHidden.mockReturnValue(false);
            watchdog.retryIfOverdue();

            expect(retry).toHaveBeenCalledExactlyOnceWith(STALL_MAX_RETRIES);
        });

        it('should skip a later retry timer that fires after the page was hidden', () => {
            // 前景已經重試過一次，之後鎖屏：下一個 timer（iOS 有時畀佢行）唔可以 reload
            const { watchdog, retry, isHidden } = setup();
            watchdog.start(STALL_MAX_RETRIES);
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);
            expect(retry).toHaveBeenCalledTimes(1);

            isHidden.mockReturnValue(true);
            vi.advanceTimersByTime(STALL_RETRY_MS * STALL_MAX_RETRIES);

            expect(retry).toHaveBeenCalledTimes(1);
            expect(watchdog.overdue).toBe(true);
        });

        /**
         * v1.20.9：已發 playing、數據夠播而位置凍結（S-551 情境 2）唔係載緊，數據喺本機，reload 唔會 abort 下載：
         * 鎖屏都要喺 deadline 即刻 reload、扣一次，同前景一樣報卡住
         */
        it('should retry at the first deadline when playing froze with data present', () => {
            const { watchdog, retry, onStalled, isHidden, isFrozenPlaying } = setup();
            isHidden.mockReturnValue(true);
            isFrozenPlaying.mockReturnValue(true);
            watchdog.start(STALL_MAX_RETRIES);

            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS - 1);
            expect(retry).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1);

            expect(onStalled).toHaveBeenCalledTimes(1);
            expect(retry).toHaveBeenCalledExactlyOnceWith(STALL_MAX_RETRIES);
            expect(watchdog.overdue).toBe(false);
        });

        it('should go back to waiting when the reloaded attempt is still loading', () => {
            const { watchdog, retry, isHidden, isFrozenPlaying } = setup();
            isHidden.mockReturnValue(true);
            isFrozenPlaying.mockReturnValue(true);
            watchdog.start(STALL_MAX_RETRIES);
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);
            isFrozenPlaying.mockReturnValue(false);

            vi.advanceTimersByTime(STALL_RETRY_MS * STALL_MAX_RETRIES);

            expect(retry).toHaveBeenCalledTimes(1);
        });

        it('should give up when play is no longer wanted while hidden', () => {
            const { watchdog, retry, allow, isHidden } = setup();
            isHidden.mockReturnValue(true);
            watchdog.start(STALL_MAX_RETRIES);
            allow.mockReturnValue(false);

            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS);

            expect(retry).not.toHaveBeenCalled();
            expect(watchdog.pending).toBe(false);
        });
        /** S-613：報咗卡住就停輪詢；之後只喺 recheckWhenParked 先再睇 */
        it('should stop polling once the stall has been reported', () => {
            const { watchdog, isHidden } = setup();
            isHidden.mockReturnValue(true);
            watchdog.start(STALL_MAX_RETRIES);

            vi.advanceTimersByTime(STALL_HIDDEN_MARK_MS);

            expect(vi.getTimerCount()).toBe(0);
            expect(watchdog.overdue).toBe(true);
        });

        it('should check once more after a parked recheck and retry a frozen attempt', () => {
            const RECHECK_MS = 1000;
            const { watchdog, retry, isHidden, isFrozenPlaying } = setup();
            isHidden.mockReturnValue(true);
            watchdog.start(STALL_MAX_RETRIES);
            vi.advanceTimersByTime(STALL_HIDDEN_MARK_MS);
            isFrozenPlaying.mockReturnValue(true);

            watchdog.recheckWhenParked(RECHECK_MS);
            vi.advanceTimersByTime(RECHECK_MS);

            expect(retry).toHaveBeenCalledExactlyOnceWith(STALL_MAX_RETRIES);
        });

        it('should ignore a parked recheck before the stall is reported', () => {
            const RECHECK_MS = 1000;
            const { watchdog, retry, isFrozenPlaying } = setup();
            watchdog.start(STALL_MAX_RETRIES);
            isFrozenPlaying.mockReturnValue(true);

            // 前景：唔可以提早過 deadline 重試
            watchdog.recheckWhenParked(RECHECK_MS);
            vi.advanceTimersByTime(STALL_FIRST_RETRY_MS - 1);

            expect(retry).not.toHaveBeenCalled();
        });

        /** S-614：慢但仲載緊，鎖屏 Play 唔 reload；過咗總上限就唔算 */
        it('should report loading only while the download grows within the wait cap', () => {
            const { watchdog, probe, isHidden } = setup();
            isHidden.mockReturnValue(true);
            probe.mockImplementation(growingProbe());
            watchdog.start(STALL_MAX_RETRIES);
            vi.advanceTimersByTime(STALL_HIDDEN_MARK_MS);

            expect(watchdog.loading).toBe(true);
            vi.advanceTimersByTime(STALL_MAX_WAIT_MS);
            expect(watchdog.loading).toBe(false);
        });

        it('should not report loading when nothing has arrived', () => {
            const { watchdog, isHidden } = setup();
            isHidden.mockReturnValue(true);
            watchdog.start(STALL_MAX_RETRIES);
            vi.advanceTimersByTime(STALL_HIDDEN_MARK_MS);

            expect(watchdog.loading).toBe(false);
        });
    });
});
