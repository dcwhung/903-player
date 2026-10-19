/** 開住 app 時每隔幾耐檢查一次新版本 */
export const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
/** 兩次檢查之間最少隔幾耐（launch 同 visibilitychange 好近，唔使撞兩次） */
export const UPDATE_CHECK_THROTTLE_MS = 60 * 1000;

/** 停咗播放最少咁耐先可以換版本（收起 app 或者返到前景時），短暫暫停唔會即刻 reload */
export const UPDATE_IDLE_GRACE_MS = 60_000;

/** controllerchange 可能觸發多過一次（多個 listener / 連續更新），確保只 reload 一次 */
export const createReloadOnce = (reload: () => void): (() => void) => {
    let reloaded = false;
    return () => {
        if (reloaded) {
            return;
        }
        reloaded = true;
        reload();
    };
};

export interface UpdateManagerDeps {
    /** 即係 registration.update()：叫瀏覽器重新攞 sw.js 睇下有冇新版 */
    checkForUpdate: () => Promise<unknown>;
    /** 換新版：先存進度，再叫 waiting SW skipWaiting */
    applyUpdate: () => void;
    /** 新 SW 已經接管：存進度再 reload */
    reload: () => void;
    now: () => number;
    isOnline: () => boolean;
    isPlaying: () => boolean;
    /** 有冇揀咗錄音：冇就代表用戶未開始聽，可以即刻換 */
    hasRecording: () => boolean;
    isVisible: () => boolean;
    /** setTimeout 包裝，返回取消 function；iOS 背景可能唔行，只係額外觸發 */
    schedule: (callback: () => void, ms: number) => () => void;
    subscribePlayback: (listener: () => void) => () => void;
}

/**
 * 靜靜雞更新：決定幾時檢查新版本、幾時換版本。
 * 所有副作用（SW、audio、時間）都由外面注入，方便測試。
 */
export class UpdateManager {
    private lastCheckedAt = Number.NEGATIVE_INFINITY;
    /** 等緊做嘅動作：refresh = 新 SW 喺 waiting；reload = 新 SW 已啟用（例如另一個 tab 換咗） */
    private pendingAction: 'refresh' | 'reload' | undefined;
    private applied = false;
    /** 播放上一次停低嘅時間；播緊就係 undefined */
    private stoppedAt: number | undefined;
    private cancelTimer: (() => void) | undefined;

    private readonly reloadOnce: () => void;

    constructor(private readonly deps: UpdateManagerDeps) {
        this.reloadOnce = createReloadOnce(deps.reload);
    }

    /** 開始追蹤播放狀態（要知幾時停低先計到 grace period），返回解除 function */
    start = (): (() => void) => {
        this.syncStoppedAt();
        const unsubscribe = this.deps.subscribePlayback(this.onPlaybackChange);
        return () => {
            unsubscribe();
            this.clearTimer();
        };
    };

    /** 離線就唔查；限流避免短時間內重複 fetch sw.js */
    checkNow = (): void => {
        const { now, isOnline, checkForUpdate } = this.deps;
        if (!isOnline() || now() - this.lastCheckedAt < UPDATE_CHECK_THROTTLE_MS) {
            return;
        }
        this.lastCheckedAt = now();
        // 網絡失敗唔緊要，下次再查
        checkForUpdate().catch(() => undefined);
    };

    /** 新版本已裝好喺 waiting：等到唔會打斷收聽嘅時機先換 */
    handleNeedRefresh = (): void => {
        this.pendingAction ??= 'refresh';
        this.syncStoppedAt();
        this.evaluate(false);
    };

    /**
     * 新 SW 已接管（controllerchange）。自己 apply 嘅就即刻 reload；
     * 否則（例如另一個 tab 換咗版本）照樣等唔會打斷收聽先 reload
     */
    handleNeedReload = (): void => {
        if (this.applied) {
            this.reloadOnce();
            return;
        }
        this.pendingAction = 'reload';
        this.syncStoppedAt();
        this.evaluate(false);
    };

    /** 返到前景（visibilitychange / bfcache）：感覺似重新開 app，停夠耐就換 */
    handleBecameVisible = (): void => this.evaluate(true);

    handleHidden = (): void => this.evaluate(false);

    private onPlaybackChange = (): void => {
        this.syncStoppedAt();
        this.evaluate(false);
    };

    /** 播緊就清走停止時間（取消等緊嘅更新）；停低就記低第一次停嘅時間 */
    private syncStoppedAt(): void {
        if (this.deps.isPlaying()) {
            this.stoppedAt = undefined;
            this.clearTimer();
        } else {
            this.stoppedAt ??= this.deps.now();
        }
    }

    private evaluate(justBecameVisible: boolean): void {
        if (this.pendingAction === undefined || this.applied) {
            return;
        }
        if (this.canApply(justBecameVisible)) {
            this.apply();
        } else {
            this.scheduleWhileHidden();
        }
    }

    /** 冇揀錄音即刻換；否則要停夠 grace period，而且 app 收埋或者啱啱返到前景 */
    private canApply(justBecameVisible: boolean): boolean {
        const { isPlaying, hasRecording, isVisible } = this.deps;
        if (isPlaying()) {
            return false;
        }
        if (!hasRecording()) {
            return true;
        }
        return this.idleForMs() >= UPDATE_IDLE_GRACE_MS && (justBecameVisible || !isVisible());
    }

    private idleForMs(): number {
        return this.stoppedAt === undefined ? 0 : this.deps.now() - this.stoppedAt;
    }

    /** 收埋時補一個 timer 喺 grace period 完再判斷；前景時永遠唔會因 timer reload */
    private scheduleWhileHidden(): void {
        this.clearTimer();
        if (this.deps.isVisible() || this.stoppedAt === undefined) {
            return;
        }
        const remainingMs = Math.max(0, UPDATE_IDLE_GRACE_MS - this.idleForMs());
        this.cancelTimer = this.deps.schedule(() => {
            this.cancelTimer = undefined;
            this.evaluate(false);
        }, remainingMs);
    }

    private clearTimer(): void {
        this.cancelTimer?.();
        this.cancelTimer = undefined;
    }

    private apply(): void {
        this.applied = true;
        this.clearTimer();
        if (this.pendingAction === 'reload') {
            this.reloadOnce();
        } else {
            this.deps.applyUpdate();
        }
    }
}

export interface UpdateCheckEnv {
    document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
    window: Pick<
        Window,
        'addEventListener' | 'removeEventListener' | 'setInterval' | 'clearInterval'
    >;
}

/**
 * Home screen app 通常由背景恢復而唔係重新載入，所以 launch、返到前景、
 * bfcache 還原同定時都要主動查。iOS 背景唔行 timer，靠 visibilitychange 補返。
 */
export const startUpdateChecks = (
    manager: Pick<UpdateManager, 'checkNow' | 'handleHidden' | 'handleBecameVisible'>,
    env: UpdateCheckEnv,
): (() => void) => {
    const isVisible = () => env.document.visibilityState === 'visible';
    const onBecameVisible = () => {
        manager.checkNow();
        manager.handleBecameVisible();
    };
    // hidden 都要通知：iOS 背景唔行 timer，收埋嗰下就要判斷停夠未
    const onVisibilityChange = () => (isVisible() ? onBecameVisible() : manager.handleHidden());
    const onPageShow = (event: PageTransitionEvent) =>
        event.persisted ? onBecameVisible() : undefined;
    const checkIfVisible = () => (isVisible() ? manager.checkNow() : undefined);
    env.document.addEventListener('visibilitychange', onVisibilityChange);
    env.window.addEventListener('pageshow', onPageShow);
    const timer = env.window.setInterval(checkIfVisible, UPDATE_CHECK_INTERVAL_MS);
    manager.checkNow();
    return () => {
        env.document.removeEventListener('visibilitychange', onVisibilityChange);
        env.window.removeEventListener('pageshow', onPageShow);
        env.window.clearInterval(timer);
    };
};
