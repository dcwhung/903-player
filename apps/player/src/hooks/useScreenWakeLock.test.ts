import { renderHook, waitFor } from '@testing-library/react';
import { useScreenWakeLock } from './useScreenWakeLock';

interface FakeSentinel {
    released: boolean;
    release: ReturnType<typeof vi.fn>;
}

const fakeSentinel = (): FakeSentinel => {
    const sentinel: FakeSentinel = {
        released: false,
        release: vi.fn(() => {
            sentinel.released = true;
            return Promise.resolve();
        }),
    };
    return sentinel;
};

/** 模擬 navigator.wakeLock：每次 request 出一個新 sentinel */
const mockWakeLock = (request = vi.fn(() => Promise.resolve(fakeSentinel()))) => {
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
    return request;
};

const sentinelOf = async (request: ReturnType<typeof mockWakeLock>, call = 0) =>
    (await request.mock.results[call]?.value) as FakeSentinel;

const setVisibility = (state: DocumentVisibilityState) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
    document.dispatchEvent(new Event('visibilitychange'));
};

afterEach(() => {
    Reflect.deleteProperty(navigator, 'wakeLock');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});

describe('useScreenWakeLock', () => {
    it('should request a screen wake lock while active', () => {
        const request = mockWakeLock();
        renderHook(() => useScreenWakeLock(true));
        expect(request).toHaveBeenCalledExactlyOnceWith('screen');
    });

    it('should not request anything while inactive', () => {
        const request = mockWakeLock();
        renderHook(() => useScreenWakeLock(false));
        expect(request).not.toHaveBeenCalled();
    });

    it('should release the lock when it becomes inactive', async () => {
        const request = mockWakeLock();
        const { rerender } = renderHook(({ on }) => useScreenWakeLock(on), {
            initialProps: { on: true },
        });
        const sentinel = await sentinelOf(request);
        await waitFor(() => expect(request).toHaveBeenCalled());

        rerender({ on: false });
        await waitFor(() => expect(sentinel.release).toHaveBeenCalledOnce());
    });

    it('should release the lock on unmount', async () => {
        const request = mockWakeLock();
        const { unmount } = renderHook(() => useScreenWakeLock(true));
        const sentinel = await sentinelOf(request);

        unmount();
        await waitFor(() => expect(sentinel.release).toHaveBeenCalledOnce());
    });

    it('should release a lock granted only after it became inactive', async () => {
        let grant: (sentinel: FakeSentinel) => void = () => {};
        const late = fakeSentinel();
        mockWakeLock(vi.fn(() => new Promise<FakeSentinel>((resolve) => (grant = resolve))));
        const { unmount } = renderHook(() => useScreenWakeLock(true));

        unmount();
        grant(late);
        await waitFor(() => expect(late.release).toHaveBeenCalledOnce());
    });

    it('should request again when the page becomes visible after the browser dropped it', async () => {
        const request = mockWakeLock();
        renderHook(() => useScreenWakeLock(true));
        const first = await sentinelOf(request);

        // 切走：瀏覽器自動放咗個 lock
        first.released = true;
        setVisibility('hidden');
        expect(request).toHaveBeenCalledOnce();

        setVisibility('visible');
        await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    });

    it('should not request twice when the lock is still held', async () => {
        const request = mockWakeLock();
        renderHook(() => useScreenWakeLock(true));
        await sentinelOf(request);

        setVisibility('visible');
        expect(request).toHaveBeenCalledOnce();
    });

    it('should not request while the page is hidden', () => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
        const request = mockWakeLock();
        renderHook(() => useScreenWakeLock(true));
        expect(request).not.toHaveBeenCalled();
    });

    it('should do nothing when the browser has no wake lock support', () => {
        expect(() => renderHook(() => useScreenWakeLock(true))).not.toThrow();
    });

    it('should silently ignore a rejected request', async () => {
        const request = mockWakeLock(vi.fn(() => Promise.reject(new Error('NotAllowedError'))));
        const { unmount } = renderHook(() => useScreenWakeLock(true));
        await waitFor(() => expect(request).toHaveBeenCalledOnce());
        expect(() => unmount()).not.toThrow();
    });

    it('should silently ignore a request that throws synchronously', () => {
        mockWakeLock(
            vi.fn(() => {
                throw new Error('NotSupportedError');
            }),
        );
        expect(() => renderHook(() => useScreenWakeLock(true))).not.toThrow();
    });
});
