import { act, renderHook } from '@testing-library/react';
import { useIdle } from './useIdle';

const TIMEOUT_MS = 30_000;

const setVisibility = (state: DocumentVisibilityState) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
    document.dispatchEvent(new Event('visibilitychange'));
};

const setup = (enabled = true) =>
    renderHook(({ on }) => useIdle(TIMEOUT_MS, on), { initialProps: { on: enabled } });

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});

describe('useIdle', () => {
    it('should become idle after the timeout without activity', () => {
        const { result } = setup();
        expect(result.current.idle).toBe(false);

        act(() => vi.advanceTimersByTime(TIMEOUT_MS - 1));
        expect(result.current.idle).toBe(false);

        act(() => vi.advanceTimersByTime(1));
        expect(result.current.idle).toBe(true);
    });

    it.each([
        ['pointerdown', () => new Event('pointerdown')],
        ['keydown', () => new KeyboardEvent('keydown', { key: 'a' })],
        ['wheel', () => new Event('wheel')],
        ['touchstart', () => new Event('touchstart')],
    ])('should restart the countdown on %s', (_name, makeEvent) => {
        const { result } = setup();
        act(() => vi.advanceTimersByTime(TIMEOUT_MS - 1));
        act(() => {
            window.dispatchEvent(makeEvent());
        });

        act(() => vi.advanceTimersByTime(TIMEOUT_MS - 1));
        expect(result.current.idle).toBe(false);
        act(() => vi.advanceTimersByTime(1));
        expect(result.current.idle).toBe(true);
    });

    it('should leave idle on activity and go idle again after another timeout', () => {
        const { result } = setup();
        act(() => vi.advanceTimersByTime(TIMEOUT_MS));
        expect(result.current.idle).toBe(true);

        act(() => {
            window.dispatchEvent(new Event('pointerdown'));
        });
        expect(result.current.idle).toBe(false);

        act(() => vi.advanceTimersByTime(TIMEOUT_MS));
        expect(result.current.idle).toBe(true);
    });

    it('should hear activity in the capture phase even when a target stops propagation', () => {
        const { result } = setup();
        const button = document.createElement('button');
        button.addEventListener('pointerdown', (event) => event.stopPropagation());
        document.body.append(button);
        act(() => vi.advanceTimersByTime(TIMEOUT_MS));

        act(() => {
            button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        });
        expect(result.current.idle).toBe(false);
        button.remove();
    });

    it('should register the activity listeners as capture and passive', () => {
        const add = vi.spyOn(window, 'addEventListener');
        setup();
        const pointer = add.mock.calls.find(([type]) => type === 'pointerdown');
        expect(pointer?.[2]).toEqual({ capture: true, passive: true });
    });

    it('should restart the countdown when the page becomes visible again', () => {
        const { result } = setup();
        act(() => vi.advanceTimersByTime(TIMEOUT_MS));
        expect(result.current.idle).toBe(true);

        act(() => setVisibility('hidden'));
        expect(result.current.idle).toBe(true);

        act(() => setVisibility('visible'));
        expect(result.current.idle).toBe(false);
        act(() => vi.advanceTimersByTime(TIMEOUT_MS));
        expect(result.current.idle).toBe(true);
    });

    it('should wake up and restart the countdown via wake()', () => {
        const { result } = setup();
        act(() => vi.advanceTimersByTime(TIMEOUT_MS));

        act(() => result.current.wake());
        expect(result.current.idle).toBe(false);

        act(() => vi.advanceTimersByTime(TIMEOUT_MS - 1));
        expect(result.current.idle).toBe(false);
        act(() => vi.advanceTimersByTime(1));
        expect(result.current.idle).toBe(true);
    });

    it('should never go idle and keep no timers or listeners while disabled', () => {
        const add = vi.spyOn(window, 'addEventListener');
        const { result } = setup(false);

        act(() => vi.advanceTimersByTime(TIMEOUT_MS * 2));
        expect(result.current.idle).toBe(false);
        expect(vi.getTimerCount()).toBe(0);
        expect(add.mock.calls.map(([type]) => type)).not.toContain('pointerdown');
        act(() => result.current.wake());
        expect(result.current.idle).toBe(false);
    });

    it('should drop idle when disabled and start a fresh countdown when enabled again', () => {
        const { result, rerender } = setup();
        act(() => vi.advanceTimersByTime(TIMEOUT_MS));
        expect(result.current.idle).toBe(true);

        rerender({ on: false });
        expect(result.current.idle).toBe(false);
        expect(vi.getTimerCount()).toBe(0);

        rerender({ on: true });
        expect(result.current.idle).toBe(false);
        act(() => vi.advanceTimersByTime(TIMEOUT_MS));
        expect(result.current.idle).toBe(true);
    });

    it('should remove its listeners and timer on unmount', () => {
        const remove = vi.spyOn(window, 'removeEventListener');
        const { unmount } = setup();
        unmount();
        expect(vi.getTimerCount()).toBe(0);
        expect(remove.mock.calls.map(([type]) => type)).toEqual(
            expect.arrayContaining(['pointerdown', 'keydown', 'wheel', 'touchstart']),
        );
    });
});
