import {
    STALL_FIRST_RETRY_MS,
    STALL_MAX_WAIT_MS,
    STALL_PROGRESS_RECHECK_MS,
    STALL_RETRY_MS,
} from '../config/constants';
import { isLoadProgressing, type LoadProbe } from './loadProgress';

export interface StallWatchdogHooks {
    /** 仲想唔想播：唔想（例如用戶暫停咗）就唔再重試 */
    canRetry: () => boolean;
    /** 重新載入再播；retriesLeft 係今次之前仲剩幾多次（記 log 用） */
    retry: (retriesLeft: number) => void;
    /** deadline 過咗仲未出聲、決定要重試：懷疑卡住（鎖屏顯示停咗，C-010） */
    onStalled: () => void;
    /** 而家嘅載入狀態：到期時同 arm 嗰陣比較，睇下載有冇進展（W-498） */
    probe: () => LoadProbe;
}

/**
 * iOS 鎖屏撳播 / 自動接住播嘅集可能一直唔出聲（停喺 0:00，或者位置凍結但顯示播緊）：
 * 等一陣都未出聲、下載亦冇進展就叫 retry，最多 n 次。
 * 只管次數同 timer，點樣重試由 AudioController 決定。
 */
export class StallWatchdog {
    /** 剩低幾多次重試；undefined = 冇睇住 */
    private retriesLeft: number | undefined;
    private timer: ReturnType<typeof setTimeout> | undefined;
    /** 而家呢次等待幾時到期（Date.now()）：iOS 暫停 JS 時 timer 唔行，但 wall clock 照行 */
    private deadline = Number.POSITIVE_INFINITY;
    /** 呢一輪由幾時開始睇住（start()）：下載有進展都最多等 STALL_MAX_WAIT_MS */
    private startedAt = Number.NEGATIVE_INFINITY;
    /** arm 嗰陣嘅載入狀態，到期時用嚟睇有冇進展 */
    private baseline: LoadProbe | undefined;

    constructor(private readonly hooks: StallWatchdogHooks) {}

    /** 睇住緊（未出聲、未放棄） */
    get pending(): boolean {
        return this.retriesLeft !== undefined;
    }

    /** 睇緊而 deadline 已經過咗（timer 可能被 iOS 凍結咗未行） */
    get overdue(): boolean {
        return this.pending && Date.now() >= this.deadline;
    }

    /**
     * 每次撳播：未睇住就開始，第一次用較短嘅 STALL_FIRST_RETRY_MS（iOS 鎖屏操作後 JS 只行一陣）。
     * 睇緊就唔郁：重試入面嘅 play() 都會叫呢度，唔可以補返次數或者推遲 timer
     */
    start(retriesLeft: number): void {
        if (!this.pending) {
            this.startedAt = Date.now();
            this.watch(retriesLeft, STALL_FIRST_RETRY_MS);
        }
    }

    /** 開始（或者重新）睇住：delayMs 後仲未 cancel 就檢查 */
    watch(retriesLeft: number, delayMs = STALL_RETRY_MS): void {
        this.retriesLeft = retriesLeft;
        this.arm(delayMs);
    }

    cancel(): void {
        clearTimeout(this.timer);
        this.timer = undefined;
        this.retriesLeft = undefined;
        this.deadline = Number.POSITIVE_INFINITY;
        this.baseline = undefined;
    }

    /** 即刻重試（timer 到，或者亮返屏幕時背景 timer 可能冇行過）；用完次數或者唔想播就放棄 */
    retryNow = (): void => {
        const { retriesLeft } = this;
        if (retriesLeft === undefined || retriesLeft <= 0 || !this.hooks.canRetry()) {
            this.cancel();
            return;
        }
        this.hooks.onStalled();
        this.hooks.retry(retriesLeft);
        this.watch(retriesLeft - 1);
    };

    /**
     * 亮屏時用：timer 到期咗但 iOS 冇畀佢行先補做（C-009）。未到期（例如撳播之後即刻切 app 再返嚟）唔郁；
     * 遲咗嘅 timer 啱啱先行過會將 deadline 推後，所以亦唔會連續重試兩次
     */
    retryIfOverdue = (): void => {
        if (this.overdue) {
            this.onDeadline();
        }
    };

    /** 重新排 timer，記低而家嘅載入狀態做比較基準 */
    private arm(delayMs: number): void {
        clearTimeout(this.timer);
        this.deadline = Date.now() + delayMs;
        this.baseline = this.hooks.probe();
        this.timer = setTimeout(this.onDeadline, delayMs);
    }

    /** 到期：慢網仲載緊就再等（唔扣次數，W-498），否則重試 */
    private onDeadline = (): void => {
        if (this.pending && this.hooks.canRetry() && this.isStillLoading()) {
            this.arm(STALL_PROGRESS_RECHECK_MS);
            return;
        }
        this.retryNow();
    };

    /** 由 arm 到而家下載有進展，而且未等夠總上限 */
    private isStillLoading(): boolean {
        const withinCap = Date.now() - this.startedAt < STALL_MAX_WAIT_MS;
        return withinCap && !!this.baseline && isLoadProgressing(this.baseline, this.hooks.probe());
    }
}
