import {
    UPDATE_CHECK_INTERVAL_MS,
    UPDATE_CHECK_THROTTLE_MS,
    UpdateManager,
    createReloadOnce,
    startUpdateChecks,
    type UpdateManagerDeps,
} from './updateManager';

interface Harness {
    deps: UpdateManagerDeps;
    manager: UpdateManager;
    checkForUpdate: ReturnType<typeof vi.fn>;
    applyUpdate: ReturnType<typeof vi.fn>;
    setPlaying: (playing: boolean) => void;
    setOnline: (online: boolean) => void;
    advance: (ms: number) => void;
}

/** 假依賴：可控時間、網絡、播放狀態 */
const createHarness = (): Harness => {
    let time = 1_000_000;
    let online = true;
    let playing = false;
    const listeners = new Set<() => void>();
    const checkForUpdate = vi.fn(async () => undefined);
    const applyUpdate = vi.fn();
    const deps: UpdateManagerDeps = {
        checkForUpdate,
        applyUpdate,
        now: () => time,
        isOnline: () => online,
        isPlaying: () => playing,
        subscribePlayback: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
    return {
        deps,
        manager: new UpdateManager(deps),
        checkForUpdate,
        applyUpdate,
        setPlaying: (value) => {
            playing = value;
            listeners.forEach((listener) => listener());
        },
        setOnline: (value) => {
            online = value;
        },
        advance: (ms) => {
            time += ms;
        },
    };
};

describe('UpdateManager.checkNow', () => {
    it('should call registration update when online', () => {
        const h = createHarness();
        h.manager.checkNow();
        expect(h.checkForUpdate).toHaveBeenCalledTimes(1);
    });

    it('should skip the check when offline', () => {
        const h = createHarness();
        h.setOnline(false);
        h.manager.checkNow();
        expect(h.checkForUpdate).not.toHaveBeenCalled();
    });

    it('should throttle checks when called again within the throttle window', () => {
        const h = createHarness();
        h.manager.checkNow();
        h.advance(UPDATE_CHECK_THROTTLE_MS - 1);
        h.manager.checkNow();
        expect(h.checkForUpdate).toHaveBeenCalledTimes(1);

        h.advance(1);
        h.manager.checkNow();
        expect(h.checkForUpdate).toHaveBeenCalledTimes(2);
    });

    it('should not count an offline skip against the throttle when back online', () => {
        const h = createHarness();
        h.setOnline(false);
        h.manager.checkNow();
        h.setOnline(true);
        h.manager.checkNow();
        expect(h.checkForUpdate).toHaveBeenCalledTimes(1);
    });

    it('should swallow update errors when the network check fails', async () => {
        const h = createHarness();
        h.checkForUpdate.mockRejectedValueOnce(new Error('offline'));
        expect(() => h.manager.checkNow()).not.toThrow();
        await Promise.resolve();
    });
});

describe('UpdateManager.handleNeedRefresh', () => {
    it('should apply the update right away when nothing is playing', () => {
        const h = createHarness();
        h.manager.handleNeedRefresh();
        expect(h.applyUpdate).toHaveBeenCalledTimes(1);
    });

    it('should wait until playback stops when audio is playing', () => {
        const h = createHarness();
        h.setPlaying(true);
        h.manager.handleNeedRefresh();
        expect(h.applyUpdate).not.toHaveBeenCalled();

        // 播放中其他狀態變化（例如 timeupdate）唔可以觸發更新
        h.setPlaying(true);
        expect(h.applyUpdate).not.toHaveBeenCalled();

        h.setPlaying(false);
        expect(h.applyUpdate).toHaveBeenCalledTimes(1);
    });

    it('should apply only once when need-refresh fires twice', () => {
        const h = createHarness();
        h.manager.handleNeedRefresh();
        h.manager.handleNeedRefresh();
        expect(h.applyUpdate).toHaveBeenCalledTimes(1);
    });

    it('should apply only once when playback toggles after a deferred update', () => {
        const h = createHarness();
        h.setPlaying(true);
        h.manager.handleNeedRefresh();
        h.manager.handleNeedRefresh();
        h.setPlaying(false);
        h.setPlaying(true);
        h.setPlaying(false);
        expect(h.applyUpdate).toHaveBeenCalledTimes(1);
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
        vi.useFakeTimers();
        visibility = 'visible';
        vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const start = () => {
        const manager = { checkNow: vi.fn() };
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

    it('should check when the document becomes visible', () => {
        const { manager, stop } = start();
        setVisibility('hidden');
        expect(manager.checkNow).toHaveBeenCalledTimes(1);
        setVisibility('visible');
        expect(manager.checkNow).toHaveBeenCalledTimes(2);
        stop();
    });

    it('should check when the page is restored from bfcache', () => {
        const { manager, stop } = start();
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
        expect(manager.checkNow).toHaveBeenCalledTimes(1);
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
        expect(manager.checkNow).toHaveBeenCalledTimes(2);
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
    });
});
