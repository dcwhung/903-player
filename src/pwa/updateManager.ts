/** 開住 app 時每隔幾耐檢查一次新版本 */
export const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
/** 兩次檢查之間最少隔幾耐（launch 同 visibilitychange 好近，唔使撞兩次） */
export const UPDATE_CHECK_THROTTLE_MS = 60 * 1000;

export interface UpdateManagerDeps {
    /** 即係 registration.update()：叫瀏覽器重新攞 sw.js 睇下有冇新版 */
    checkForUpdate: () => Promise<unknown>;
    /** 換新版：先存進度，再叫 waiting SW skipWaiting */
    applyUpdate: () => void;
    now: () => number;
    isOnline: () => boolean;
    isPlaying: () => boolean;
    subscribePlayback: (listener: () => void) => () => void;
}

/**
 * 靜靜雞更新：決定幾時檢查新版本、幾時換版本。
 * 所有副作用（SW、audio、時間）都由外面注入，方便測試。
 */
export class UpdateManager {
    private lastCheckedAt = Number.NEGATIVE_INFINITY;
    private applied = false;
    private unsubscribe: (() => void) | undefined;

    constructor(private readonly deps: UpdateManagerDeps) {}

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

    /** 新版本已裝好喺 waiting：冇播放就即刻換，播緊就等停咗先換，唔好打斷收聽 */
    handleNeedRefresh = (): void => {
        if (this.applied || this.tryApply()) {
            return;
        }
        this.unsubscribe ??= this.deps.subscribePlayback(this.tryApply);
    };

    private tryApply = (): boolean => {
        if (this.applied || this.deps.isPlaying()) {
            return this.applied;
        }
        this.applied = true;
        this.unsubscribe?.();
        this.unsubscribe = undefined;
        this.deps.applyUpdate();
        return true;
    };
}

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
    manager: Pick<UpdateManager, 'checkNow'>,
    env: UpdateCheckEnv,
): (() => void) => {
    const isVisible = () => env.document.visibilityState === 'visible';
    const checkIfVisible = () => (isVisible() ? manager.checkNow() : undefined);
    const onPageShow = (event: PageTransitionEvent) =>
        event.persisted ? manager.checkNow() : undefined;
    env.document.addEventListener('visibilitychange', checkIfVisible);
    env.window.addEventListener('pageshow', onPageShow);
    const timer = env.window.setInterval(checkIfVisible, UPDATE_CHECK_INTERVAL_MS);
    manager.checkNow();
    return () => {
        env.document.removeEventListener('visibilitychange', checkIfVisible);
        env.window.removeEventListener('pageshow', onPageShow);
        env.window.clearInterval(timer);
    };
};
