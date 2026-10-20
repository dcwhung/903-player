import { renderHook } from '@testing-library/react';
import { createRef } from 'react';
import { useStripMotion } from './useStripMotion';

/** 碟轉緊（transition 中途）：getComputedStyle 讀到嘅係畫面上嘅角度，唔係 inline 嘅目標角度 */
const discMidSpin = (computed: string) => {
    const disc = document.createElement('img');
    const spinRef = createRef<HTMLElement>() as { current: HTMLElement | null };
    spinRef.current = disc;
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        transform: computed,
    } as CSSStyleDeclaration);
    return { disc, spinRef };
};

describe('useStripMotion', () => {
    afterEach(() => vi.restoreAllMocks());

    it('picks a spinning disc up where it is instead of jumping to the spin target', () => {
        const { disc, spinRef } = discMidSpin('matrix(0, 1, -1, 0, 0, 0)');
        const { result } = renderHook(() => useStripMotion(spinRef));
        result.current.trackRef.current = document.createElement('div');

        // 轉集：目標係 360 度（順時針轉返正），轉到一半（畫面上 90 度）就再拖
        result.current.commit('next');
        expect(disc.style.transform).toBe('rotate(360deg)');
        result.current.grab();
        result.current.follow(0);

        // 由畫面上嘅 90 度接住（喺目標 360 後面一圈之內），唔會跳去 360
        expect(disc.style.transform).toBe('rotate(90deg)');
        expect(disc.style.transition).toBe('none');
    });

    it('finishes the clockwise turn to upright when a grabbed disc springs back', () => {
        const { disc, spinRef } = discMidSpin('matrix(0, 1, -1, 0, 0, 0)');
        const { result } = renderHook(() => useStripMotion(spinRef));
        result.current.trackRef.current = document.createElement('div');

        result.current.commit('next');
        result.current.grab();
        result.current.follow(20);
        result.current.springBack();

        expect(disc.style.transform).toBe('rotate(360deg)');
        expect(disc.style.transition).toBe('');
    });

    it('turns a grabbed disc on to the next upright angle when the drag switches episode', () => {
        const { disc, spinRef } = discMidSpin('matrix(0, 1, -1, 0, 0, 0)');
        const { result } = renderHook(() => useStripMotion(spinRef));
        result.current.trackRef.current = document.createElement('div');

        result.current.commit('next');
        result.current.grab();
        result.current.follow(-40);
        result.current.commit('next');

        // 畫面上 90 − 20 = 70 度，順時針最少半圈 → 360
        expect(disc.style.transform).toBe('rotate(360deg)');
    });

    it('leaves the disc alone when it has no readable transform', () => {
        const { disc, spinRef } = discMidSpin('none');
        const { result } = renderHook(() => useStripMotion(spinRef));

        result.current.grab();
        result.current.follow(10);

        expect(disc.style.transform).toBe('rotate(5deg)');
    });
});
