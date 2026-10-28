import { STALL_RETRY_MS } from '../config/constants';

export interface StallWatchdogHooks {
    /** 仲想唔想播：唔想（例如用戶暫停咗）就唔再重試 */
    canRetry: () => boolean;
    /** 重新載入再播；retriesLeft 係今次之前仲剩幾多次（記 log 用） */
    retry: (retriesLeft: number) => void;
}

/**
 * iOS 鎖屏自動接住播嘅集可能一直唔載（停喺 0:00 但顯示播緊）：
 * 等 STALL_RETRY_MS 都未出聲就叫 retry，最多 watch(n) 嘅 n 次。
 * 只管次數同 timer，點樣重試由 AudioController 決定。
 */
export class StallWatchdog {
    /** 剩低幾多次重試；undefined = 冇睇住 */
    private retriesLeft: number | undefined;
    private timer: ReturnType<typeof setTimeout> | undefined;

    constructor(private readonly hooks: StallWatchdogHooks) {}

    /** 睇住緊（未出聲、未放棄） */
    get pending(): boolean {
        return this.retriesLeft !== undefined;
    }

    /** 開始（或者重新）睇住：STALL_RETRY_MS 後仲未 cancel 就重試 */
    watch(retriesLeft: number): void {
        this.cancel();
        this.retriesLeft = retriesLeft;
        this.timer = setTimeout(this.retryNow, STALL_RETRY_MS);
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
        this.hooks.retry(retriesLeft);
        this.watch(retriesLeft - 1);
    };
}
