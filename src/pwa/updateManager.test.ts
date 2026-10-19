import {
    UPDATE_CHECK_INTERVAL_MS,
    UPDATE_CHECK_THROTTLE_MS,
    UPDATE_IDLE_GRACE_MS,
    UpdateManager,
    createReloadOnce,
    startUpdateChecks,
    type UpdateManagerDeps,
} from './updateManager';

const ONE_SECOND_MS = 1000;
const LONG_PAUSE_MS = 10 * 60 * 60 * 1000;

/** 假依賴：用 fake timers 控制時間，可以改網絡、可見度、播放狀態 */
const createHarness = () => {
    let online = true;
    let playing = false;
    let loaded = true;
    let visible = true;
    const listeners = new Set<() => void>();
    const notify = () => listeners.forEach((listener) => listener());
    const deps: UpdateManagerDeps = {
        checkForUpdate: vi.fn(async () => undefined),
        applyUpdate: vi.fn(),
        now: () => Date.now(),
        isOnline: () => online,
        isPlaying: () => playing,
        hasRecording: () => loaded,
        isVisible: () => visible,
        schedule: (callback, ms) => {
            const id = setTimeout(callback, ms);
            return () => clearTimeout(id);
        },
        subscribePlayback: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
    const manager = new UpdateManager(deps);
    const stop = manager.start();
    return {
        deps,
        manager,
        stop,
        setOnline: (value: boolean) => (online = value),
        setLoaded: (value: boolean) => (loaded = value),
        setPlaying: (value: boolean) => {
            playing = value;
            notify();
        },
        hide: () => {
            visible = false;
            manager.handleHidden();
        },
        show: () => {
            visible = true;
            manager.handleBecameVisible();
        },
    };
};

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('UpdateManager.checkNow', () => {
    it('should call registration update when online', () => {
        const h = createHarness();
        h.manager.checkNow();
        expect(h.deps.checkForUpdate).toHaveBeenCalledTimes(1);
    });

    it('should skip the check when offline', () => {
        const h = createHarness();
        h.setOnline(false);
        h.manager.checkNow();
        expect(h.deps.checkForUpdate).not.toHaveBeenCalled();
    });

    it('should throttle checks when called again within the throttle window', () => {
        const h = createHarness();
        h.manager.checkNow();
        vi.advanceTimersByTime(UPDATE_CHECK_THROTTLE_MS - 1);
        h.manager.checkNow();
        expect(h.deps.checkForUpdate).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1);
        h.manager.checkNow();
        expect(h.deps.checkForUpdate).toHaveBeenCalledTimes(2);
    });

    it('should not count an offline skip against the throttle when back online', () => {
        const h = createHarness();
        h.setOnline(false);
        h.manager.checkNow();
        h.setOnline(true);
        h.manager.checkNow();
        expect(h.deps.checkForUpdate).toHaveBeenCalledTimes(1);
    });

    it('should swallow update errors when the network check fails', async () => {
        const h = createHarness();
        vi.mocked(h.deps.checkForUpdate).mockRejectedValueOnce(new Error('offline'));
        expect(() => h.manager.checkNow()).not.toThrow();
        await Promise.resolve();
    });
});

describe('UpdateManager apply rule', () => {
    it('should apply right away when no recording is loaded', () => {
        const h = createHarness();
        h.setLoaded(false);
        h.manager.handleNeedRefresh();
        expect(h.deps.applyUpdate).toHaveBeenCalledTimes(1);
    });

    it('should never apply when visible and paused however long it has been', () => {
        const h = createHarness();
        h.manager.handleNeedRefresh();
        vi.advanceTimersByTime(LONG_PAUSE_MS);
        h.setPlaying(false);
        h.manager.handleNeedRefresh();
        expect(h.deps.applyUpdate).not.toHaveBeenCalled();
    });

    it('should not apply when hidden for less than the grace period', () => {
        const h = createHarness();
        h.manager.handleNeedRefresh();
        h.hide();
        vi.advanceTimersByTime(UPDATE_IDLE_GRACE_MS - ONE_SECOND_MS);
        expect(h.deps.applyUpdate).not.toHaveBeenCalled();
    });

    it('should apply when hidden and stopped for the grace period', () => {
        const h = createHarness();
        h.manager.handleNeedRefresh();
        h.hide();
        vi.advanceTimersByTime(UPDATE_IDLE_GRACE_MS);
        expect(h.deps.applyUpdate).toHaveBeenCalledTimes(1);
    });

    it('should apply on hide when already stopped for the grace period', () => {
        // iOS 背景唔行 timer：靠 visibilitychange 重新判斷
        const h = createHarness();
        vi.advanceTimersByTime(UPDATE_IDLE_GRACE_MS);
        h.manager.handleNeedRefresh();
        expect(h.deps.applyUpdate).not.toHaveBeenCalled();
        h.hide();
        expect(h.deps.applyUpdate).toHaveBeenCalledTimes(1);
    });

    it('should apply when becoming visible after more than the grace period paused', () => {
        const h = createHarness();
        h.manager.handleNeedRefresh();
        vi.advanceTimersByTime(UPDATE_IDLE_GRACE_MS + ONE_SECOND_MS);
        expect(h.deps.applyUpdate).not.toHaveBeenCalled();
        h.show();
        expect(h.deps.applyUpdate).toHaveBeenCalledTimes(1);
    });

    it('should not apply when becoming visible before the grace period ends', () => {
        const h = createHarness();
        h.manager.handleNeedRefresh();
        h.hide();
        vi.advanceTimersByTime(UPDATE_IDLE_GRACE_MS - ONE_SECOND_MS);
        h.show();
        vi.advanceTimersByTime(LONG_PAUSE_MS);
        expect(h.deps.applyUpdate).not.toHaveBeenCalled();
    });

    it('should wait while playing even when hidden for a long time', () => {
        const h = createHarness();
        h.setPlaying(true);
        h.manager.handleNeedRefresh();
        h.hide();
        vi.advanceTimersByTime(LONG_PAUSE_MS);
        expect(h.deps.applyUpdate).not.toHaveBeenCalled();
    });

    it('should count the grace period from when playback stopped', () => {
        const h = createHarness();
        h.setPlaying(true);
        h.manager.handleNeedRefresh();
        h.hide();
        vi.advanceTimersByTime(LONG_PAUSE_MS);
        h.setPlaying(false);
        vi.advanceTimersByTime(UPDATE_IDLE_GRACE_MS - ONE_SECOND_MS);
        expect(h.deps.applyUpdate).not.toHaveBeenCalled();
        vi.advanceTimersByTime(ONE_SECOND_MS);
        expect(h.deps.applyUpdate).toHaveBeenCalledTimes(1);
    });

    it('should cancel the pending apply when playback resumes', () => {
        const h = createHarness();
        h.manager.handleNeedRefresh();
        h.hide();
        vi.advanceTimersByTime(UPDATE_IDLE_GRACE_MS / 2);
        h.setPlaying(true);
        vi.advanceTimersByTime(UPDATE_IDLE_GRACE_MS);
        expect(h.deps.applyUpdate).not.toHaveBeenCalled();
        // 再停：由新嘅停止時間重新計
        h.setPlaying(false);
        vi.advanceTimersByTime(UPDATE_IDLE_GRACE_MS - ONE_SECOND_MS);
        expect(h.deps.applyUpdate).not.toHaveBeenCalled();
    });

    it('should apply only once when need-refresh fires again', () => {
        const h = createHarness();
        h.setLoaded(false);
        h.manager.handleNeedRefresh();
        h.manager.handleNeedRefresh();
        h.hide();
        h.show();
        expect(h.deps.applyUpdate).toHaveBeenCalledTimes(1);
    });

    it('should not apply when nothing is waiting', () => {
        const h = createHarness();
        h.setLoaded(false);
        h.hide();
        h.show();
        expect(h.deps.applyUpdate).not.toHaveBeenCalled();
    });

    it('should stop the grace timer when stopped', () => {
        const h = createHarness();
        h.manager.handleNeedRefresh();
        h.hide();
        h.stop();
        vi.advanceTimersByTime(UPDATE_IDLE_GRACE_MS);
        expect(h.deps.applyUpdate).not.toHaveBeenCalled();
    });
});

describe('createReloadOnce', () => {
    it('should reload only once when called repeatedly', () => {
        const reload = vi.fn();
        const reloadOnce = createReloadOnce(reload);
        reloadOnce();
        reloadOnce();
        expect(reload).toHaveBeenCalledTimes(1);
    });
});

describe('startUpdateChecks', () => {
    let visibility: DocumentVisibilityState;

    beforeEach(() => {
        visibility = 'visible';
        vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    });

    const start = () => {
        const manager = {
            checkNow: vi.fn(),
            handleHidden: vi.fn(),
            handleBecameVisible: vi.fn(),
        };
        const stop = startUpdateChecks(manager, { document, window });
        return { manager, stop };
    };

    const setVisibility = (state: DocumentVisibilityState) => {
        visibility = state;
        document.dispatchEvent(new Event('visibilitychange'));
    };

    it('should check on launch', () => {
        const { manager, stop } = start();
        expect(manager.checkNow).toHaveBeenCalledTimes(1);
        stop();
    });

    it('should check and re-evaluate when the document becomes visible', () => {
        const { manager, stop } = start();
        setVisibility('hidden');
        expect(manager.checkNow).toHaveBeenCalledTimes(1);
        expect(manager.handleHidden).toHaveBeenCalledTimes(1);
        setVisibility('visible');
        expect(manager.checkNow).toHaveBeenCalledTimes(2);
        expect(manager.handleBecameVisible).toHaveBeenCalledTimes(1);
        stop();
    });

    it('should check and re-evaluate when the page is restored from bfcache', () => {
        const { manager, stop } = start();
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
        expect(manager.checkNow).toHaveBeenCalledTimes(1);
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
        expect(manager.checkNow).toHaveBeenCalledTimes(2);
        expect(manager.handleBecameVisible).toHaveBeenCalledTimes(1);
        stop();
    });

    it('should check periodically when visible', () => {
        const { manager, stop } = start();
        vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS * 2);
        expect(manager.checkNow).toHaveBeenCalledTimes(3);
        stop();
    });

    it('should not run interval checks when hidden', () => {
        const { manager, stop } = start();
        visibility = 'hidden';
        vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS * 3);
        expect(manager.checkNow).toHaveBeenCalledTimes(1);
        stop();
    });

    it('should stop listening when stopped', () => {
        const { manager, stop } = start();
        stop();
        setVisibility('visible');
        vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
        expect(manager.checkNow).toHaveBeenCalledTimes(1);
        expect(manager.handleBecameVisible).not.toHaveBeenCalled();
    });
});
