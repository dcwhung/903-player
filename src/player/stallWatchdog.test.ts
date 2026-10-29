import { STALL_FIRST_RETRY_MS, STALL_MAX_RETRIES, STALL_RETRY_MS } from '../config/constants';
import { StallWatchdog } from './stallWatchdog';

const setup = (canRetry = true) => {
    const retry = vi.fn<(retriesLeft: number) => void>();
    const allow = vi.fn(() => canRetry);
    const onStalled = vi.fn();
    const watchdog = new StallWatchdog({ canRetry: allow, retry, onStalled });
    return { watchdog, retry, allow, onStalled };
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
});
