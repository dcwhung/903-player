import { act, renderHook } from '@testing-library/react';
import { stubViewport } from '../../../../../tests/landscape';
import { useNightFade } from './useAmbientNight';
import { nightLevelOf } from './useAmbientWake';

/** 兩格 rAF（等日間嘅樣畫咗先轉，transition 先有起點） */
const nextFrames = () =>
    act(() => {
        vi.advanceTimersToNextFrame();
        vi.advanceTimersToNextFrame();
    });

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('useNightFade', () => {
    it('should start in day when mounted for a night target, then switch after the day look is painted', () => {
        const { result } = renderHook(() => useNightFade(true, false));
        expect(result.current).toBe(false);

        nextFrames();

        expect(result.current).toBe(true);
    });

    it('should start in night immediately when told to (expired by timer)', () => {
        const { result } = renderHook(() => useNightFade(true, true));
        expect(result.current).toBe(true);
    });

    it('should not start in night for a day target even when told to', () => {
        const { result } = renderHook(() => useNightFade(false, true));
        expect(result.current).toBe(false);
    });

    it('should follow the target back to day (cancel, 05:00)', () => {
        const { result, rerender } = renderHook(({ target }) => useNightFade(target, true), {
            initialProps: { target: true },
        });

        rerender({ target: false });
        nextFrames();

        expect(result.current).toBe(false);
    });

    it('should switch at once under reduced motion (no frames to wait for)', () => {
        stubViewport({ width: 544, height: 544 }, { reducedMotion: true });
        const { result } = renderHook(() => useNightFade(true, false));
        expect(result.current).toBe(true);
    });

    it('should drop a pending switch when the target flips back before it happens', () => {
        const { result, rerender } = renderHook(({ target }) => useNightFade(target, false), {
            initialProps: { target: true },
        });

        rerender({ target: false });
        nextFrames();

        expect(result.current).toBe(false);
    });
});

describe('nightLevelOf', () => {
    it('should read the current (mid-transition) opacity of the night level element', () => {
        const el = document.createElement('span');
        el.style.opacity = '0.4';
        expect(nightLevelOf(el)).toBeCloseTo(0.4);
    });

    it('should be 0 without an element', () => {
        expect(nightLevelOf(null)).toBe(0);
    });

    it('should be 0 when the opacity cannot be read', () => {
        const el = document.createElement('span');
        el.style.opacity = '';
        vi.spyOn(window, 'getComputedStyle').mockReturnValue({
            opacity: '',
        } as CSSStyleDeclaration);
        expect(nightLevelOf(el)).toBe(0);
    });
});
