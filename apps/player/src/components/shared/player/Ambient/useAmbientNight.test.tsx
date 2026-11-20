import { act, renderHook } from '@testing-library/react';
import { stubViewport } from '../../../../../tests/landscape';
import { useNightFade } from './useAmbientNight';
import { nightLevelOf } from './useAmbientWake';

/** 同 tokens.css --ambient-night-fade（jsdom 冇載 tokens.css，測試自己設） */
const FADE = '60s';
const FADE_MS = 60_000;

/** 兩格 rAF（等日間嘅樣畫咗先轉，transition 先有起點） */
const nextFrames = () =>
    act(() => {
        vi.advanceTimersToNextFrame();
        vi.advanceTimersToNextFrame();
    });

beforeEach(() => {
    vi.useFakeTimers({
        toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'],
    });
    document.documentElement.style.setProperty('--ambient-night-fade', FADE);
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty('--ambient-night-fade');
});

describe('useNightFade', () => {
    it('should start in day when mounted for a night target, then switch after the day look is painted', () => {
        const { result } = renderHook(() => useNightFade(true, false));
        expect(result.current.night).toBe(false);

        nextFrames();

        expect(result.current.night).toBe(true);
    });

    it('should start in night immediately when told to (expired by timer)', () => {
        const { result } = renderHook(() => useNightFade(true, true));
        expect(result.current.night).toBe(true);
    });

    it('should not start in night for a day target even when told to', () => {
        const { result } = renderHook(() => useNightFade(false, true));
        expect(result.current.night).toBe(false);
    });

    it('should follow the target back to day (cancel, 05:00)', () => {
        const { result, rerender } = renderHook(({ target }) => useNightFade(target, true), {
            initialProps: { target: true },
        });

        rerender({ target: false });
        nextFrames();

        expect(result.current.night).toBe(false);
    });

    it('should switch at once under reduced motion (no frames to wait for)', () => {
        stubViewport({ width: 544, height: 544 }, { reducedMotion: true });
        const { result } = renderHook(() => useNightFade(true, false));
        expect(result.current.night).toBe(true);
    });

    it('should drop a pending switch when the target flips back before it happens', () => {
        const { result, rerender } = renderHook(({ target }) => useNightFade(target, false), {
            initialProps: { target: true },
        });

        rerender({ target: false });
        nextFrames();

        expect(result.current.night).toBe(false);
    });

    // W-857：60 秒過場淨係夜間切換期間先生效，日間暫停 / 換色調照舊即時
    it('should not be fading while nothing switches', () => {
        const { result } = renderHook(() => useNightFade(false, false));
        expect(result.current.fading).toBe(false);
    });

    it('should be fading from the pending switch until the fade token has elapsed', () => {
        const { result } = renderHook(() => useNightFade(true, false));
        expect(result.current.fading).toBe(true);

        nextFrames();
        act(() => vi.advanceTimersByTime(FADE_MS - 1));
        expect(result.current.fading).toBe(true);

        act(() => vi.advanceTimersByTime(1));
        expect(result.current).toEqual({ night: true, fading: false });
    });

    it('should fade again when switching back to day', () => {
        const { result, rerender } = renderHook(({ target }) => useNightFade(target, true), {
            initialProps: { target: true },
        });
        expect(result.current.fading).toBe(false);

        rerender({ target: false });
        nextFrames();

        expect(result.current).toEqual({ night: false, fading: true });
        act(() => vi.advanceTimersByTime(FADE_MS));
        expect(result.current.fading).toBe(false);
    });

    it('should not fade when mounted straight into night (expired by timer)', () => {
        const { result } = renderHook(() => useNightFade(true, true));
        expect(result.current.fading).toBe(false);
    });

    it('should not fade under reduced motion', () => {
        stubViewport({ width: 544, height: 544 }, { reducedMotion: true });
        const { result } = renderHook(() => useNightFade(true, false));
        expect(result.current).toEqual({ night: true, fading: false });
    });

    it('should clear the fade timeout on unmount', () => {
        const { unmount } = renderHook(() => useNightFade(true, false));
        nextFrames();

        unmount();

        expect(vi.getTimerCount()).toBe(0);
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
