import { STALL_FIRST_RETRY_MS, STALL_RETRY_DEDUPE_MS, STALL_RETRY_MS } from '../config/constants';

export interface StallWatchdogHooks {
    /** 仲想唔想播：唔想（例如用戶暫停咗）就唔再重試 */
    canRetry: () => boolean;
    /** 重新載入再播；retriesLeft 係今次之前仲剩幾多次（記 log 用） */
    retry: (retriesLeft: number) => void;
}

/**
 * iOS 鎖屏撳播 / 自動接住播嘅集可能一直唔出聲（停喺 0:00，或者位置凍結但顯示播緊）：
 * 等一陣都未出聲就叫 retry，最多 n 次。
 * 只管次數同 timer，點樣重試由 AudioController 決定。
 */
export class StallWatchdog {
    /** 剩低幾多次重試；undefined = 冇睇住 */
    private retriesLeft: number | undefined;
    private timer: ReturnType<typeof setTimeout> | undefined;
    /** 對上一次重試嘅時間（Date.now()） */
    private lastRetryAt = Number.NEGATIVE_INFINITY;

    constructor(private readonly hooks: StallWatchdogHooks) {}

    /** 睇住緊（未出聲、未放棄） */
    get pending(): boolean {
        return this.retriesLeft !== undefined;
    }

    /**
     * 每次撳播：未睇住就開始，第一次用較短嘅 STALL_FIRST_RETRY_MS（iOS 鎖屏操作後 JS 只行一陣）。
     * 睇緊就唔郁：重試入面嘅 play() 都會叫呢度，唔可以補返次數或者推遲 timer
     */
    start(retriesLeft: number): void {
        if (!this.pending) {
            this.watch(retriesLeft, STALL_FIRST_RETRY_MS);
        }
    }

    /** 開始（或者重新）睇住：delayMs 後仲未 cancel 就重試 */
    watch(retriesLeft: number, delayMs = STALL_RETRY_MS): void {
        this.cancel();
        this.retriesLeft = retriesLeft;
        this.timer = setTimeout(this.retryNow, delayMs);
    }

    cancel(): void {
        clearTimeout(this.timer);
        this.timer = undefined;
        this.retriesLeft = undefined;
    }

    /** 即刻重試（timer 到，或者亮返屏幕時背景 timer 可能冇行過）；用完次數或者唔想播就放棄 */
    retryNow = (): void => {
        const { retriesLeft } = this;
        if (retriesLeft === undefined || retriesLeft <= 0 || !this.hooks.canRetry()) {
            this.cancel();
            return;
        }
        this.lastRetryAt = Date.now();
        this.hooks.retry(retriesLeft);
        this.watch(retriesLeft - 1);
    };

    /** 亮屏時用：啱啱先重試過（例如遲咗嘅 timer 啱啱先行）就唔再嘥一次 */
    retryUnlessRecent = (): void => {
        if (Date.now() - this.lastRetryAt >= STALL_RETRY_DEDUPE_MS) {
            this.retryNow();
        }
    };
}
