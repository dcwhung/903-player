import {
    STALL_FIRST_RETRY_MS,
    STALL_HIDDEN_MARK_MS,
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
    /**
     * 頁面喺背景 / 鎖屏（document hidden）：唔可以自動 reload，iOS 鎖屏載入要 ~4.3 s，
     * reload 會 abort 佢而之後背景再唔載完（v1.20.8）
     */
    isHidden: () => boolean;
    /**
     * 今次嘗試已發 playing、數據夠播（rs ≥ HAVE_FUTURE_DATA）而位置凍結咗 FROZEN_PLAYING_MS：
     * pipeline 死咗、數據已喺本機，reload 唔會 abort 下載，鎖屏都照樣 reload（v1.20.9）
     */
    isFrozenPlaying: () => boolean;
}

/**
 * iOS 鎖屏撳播 / 自動接住播嘅集可能一直唔出聲（停喺 0:00，或者位置凍結但顯示播緊）：
 * 前景等一陣都未出聲、下載亦冇進展就叫 retry，最多 n 次。
 * 鎖屏（hidden，包括切 app / 背景 tab）仲載緊時唔 retry、唔扣次數，只係保持 overdue，等亮屏 / 鎖屏 Play；
 * 等夠 STALL_HIDDEN_MARK_MS 先報卡住（v1.20.8）。鎖屏但 playing 已發、數據夠播而位置凍結
 * 就同前景一樣即刻 retry（v1.20.9）。
 * 只管次數同 timer，點樣重試由 AudioController 決定。
 */
export class StallWatchdog {
    /** 剩低幾多次重試；undefined = 冇睇住 */
    private retriesLeft: number | undefined;
    private timer: ReturnType<typeof setTimeout> | undefined;
    /** checkFrozenIn 排嘅凍結檢查 */
    private frozenTimer: ReturnType<typeof setTimeout> | undefined;
    /** 而家呢次等待幾時到期（Date.now()）：iOS 暫停 JS 時 timer 唔行，但 wall clock 照行 */
    private deadline = Number.POSITIVE_INFINITY;
    /** 呢一輪由幾時開始睇住（start()）：下載有進展都最多等 STALL_MAX_WAIT_MS */
    private startedAt = Number.NEGATIVE_INFINITY;
    /** arm 嗰陣嘅載入狀態，到期時用嚟睇有冇進展 */
    private baseline: LoadProbe | undefined;
    /**
     * 鎖屏上一次 tick 嘅載入狀態：loading 同佢比較。iOS 亮 JS 時遲咗嘅 tick 可能啱啱喺
     * 鎖屏 Play 之前更新 baseline，同最新嗰個比會當冇進展而 abort 慢載（W-511）
     */
    private previousBaseline: LoadProbe | undefined;
    /** 今次嘗試（start / 每次 retry reload）幾時開始：鎖屏時由呢度計 STALL_HIDDEN_MARK_MS */
    private attemptStartedAt = Number.NEGATIVE_INFINITY;
    /** 今次嘗試鎖屏時已經報過卡住，唔使再報 */
    private hiddenStallReported = false;

    constructor(private readonly hooks: StallWatchdogHooks) {}

    /** 睇住緊（未出聲、未放棄） */
    get pending(): boolean {
        return this.retriesLeft !== undefined;
    }

    /**
     * 睇緊而由 arm 到而家下載有進展、未等夠 STALL_MAX_WAIT_MS：慢但正常載緊。
     * 鎖屏 Play 見到就唔 reload，免得 abort 佢（S-614）
     */
    get loading(): boolean {
        return this.pending && this.isStillLoading(this.previousBaseline ?? this.baseline);
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
            this.startAttempt();
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
        clearTimeout(this.frozenTimer);
        this.timer = undefined;
        this.frozenTimer = undefined;
        this.retriesLeft = undefined;
        this.deadline = Number.POSITIVE_INFINITY;
        this.baseline = undefined;
        this.previousBaseline = undefined;
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
        this.startAttempt();
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

    /**
     * delayMs 後睇下 playing 係咪凍結咗：過咗 deadline 先郁，同亮屏補做一樣（retryIfOverdue）。
     * AudioController 每次 playing / waiting 都叫，凍結時間由最新嗰個計（v1.20.9、S-617）；
     * 鎖屏報咗卡住之後唔再輪詢，靠呢個 timer 救凍結（S-613、C-011）
     */
    checkFrozenIn(delayMs: number): void {
        if (this.pending) {
            clearTimeout(this.frozenTimer);
            this.frozenTimer = setTimeout(this.retryIfOverdue, delayMs);
        }
    }

    /** 重新排 timer，記低而家嘅載入狀態做比較基準 */
    private arm(delayMs: number): void {
        clearTimeout(this.timer);
        this.deadline = Date.now() + delayMs;
        this.baseline = this.hooks.probe();
        this.previousBaseline = undefined;
        this.timer = setTimeout(this.onDeadline, delayMs);
    }

    /** 新一次嘗試（開播 / reload）：鎖屏報卡住由頭計 */
    private startAttempt(): void {
        this.attemptStartedAt = Date.now();
        this.hiddenStallReported = false;
    }

    /**
     * 到期：鎖屏仲載緊就唔郁（v1.20.8），鎖屏但 pipeline 死咗（playing 後凍結）照樣重試（v1.20.9）；
     * 前景慢網仲載緊就再等（唔扣次數，W-498），否則重試
     */
    private onDeadline = (): void => {
        const wanted = this.pending && this.hooks.canRetry();
        if (wanted && this.hooks.isHidden() && !this.hooks.isFrozenPlaying()) {
            this.waitWhileHidden();
            return;
        }
        if (wanted && this.isStillLoading()) {
            this.arm(this.nextRecheckMs());
            return;
        }
        this.retryNow();
    };

    /**
     * 鎖屏時到期：唔 reload（會 abort iOS 載緊嘅數據）、唔扣次數。deadline 唔推後，
     * 保持 overdue 畀亮屏 / 鎖屏 Play 即刻 reload；等夠 STALL_HIDDEN_MARK_MS 先報卡住（鎖屏顯示 Play）。
     * 報咗之後唔再排 timer：亮屏由 visibilitychange、鎖屏 Play 由 resume() 接手，
     * 凍結由 checkFrozenIn 睇（S-613、C-011）。每次都更新進展基準，
     * loading 先係「最近仲載緊」而唔係「開播之後載過嘢」（W-510）；loading 用上一個，見 previousBaseline
     */
    private waitWhileHidden(): void {
        const untilMark = this.attemptStartedAt + STALL_HIDDEN_MARK_MS - Date.now();
        this.previousBaseline = this.baseline;
        this.baseline = this.hooks.probe();
        clearTimeout(this.timer);
        this.timer = undefined;
        if (untilMark > 0) {
            this.timer = setTimeout(
                this.onDeadline,
                Math.min(untilMark, STALL_PROGRESS_RECHECK_MS),
            );
        } else if (!this.hiddenStallReported) {
            this.hiddenStallReported = true;
            this.hooks.onStalled();
        }
    }

    /** 下一次 recheck：唔可以排喺 STALL_MAX_WAIT_MS 之後，上限先真係上限（S-582） */
    private nextRecheckMs(): number {
        const untilCap = this.startedAt + STALL_MAX_WAIT_MS - Date.now();
        return Math.min(STALL_PROGRESS_RECHECK_MS, untilCap);
    }

    /** 由 since（預設 arm / 最近一次 tick）到而家下載有進展，而且未等夠總上限 */
    private isStillLoading(since = this.baseline): boolean {
        const withinCap = Date.now() - this.startedAt < STALL_MAX_WAIT_MS;
        return withinCap && !!since && isLoadProgressing(since, this.hooks.probe());
    }
}
