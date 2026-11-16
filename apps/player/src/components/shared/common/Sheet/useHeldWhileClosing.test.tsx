import { renderHook } from '@testing-library/react';
import { useHeldWhileClosing } from './useHeldWhileClosing';

const hold = (initial: { value: string[]; open: boolean }) => {
    let renders = 0;
    const hook = renderHook(
        ({ value, open }) => {
            renders += 1;
            return useHeldWhileClosing(value, open);
        },
        { initialProps: initial },
    );
    return { ...hook, renders: () => renders };
};

describe('useHeldWhileClosing', () => {
    it('should pass the value through while open', () => {
        const { result, rerender } = hold({ value: ['a'], open: true });
        const next = ['b'];
        rerender({ value: next, open: true });
        expect(result.current).toBe(next);
    });

    it('should keep the last open value while closing, even when the parent clears it', () => {
        const last = ['b'];
        const { result, rerender } = hold({ value: ['a'], open: true });
        rerender({ value: last, open: true });
        rerender({ value: [], open: false });
        expect(result.current).toBe(last);
    });

    it('should show the new value again once reopened', () => {
        const { result, rerender } = hold({ value: ['a'], open: true });
        rerender({ value: [], open: false });
        const reopened = ['c'];
        rerender({ value: reopened, open: true });
        expect(result.current).toBe(reopened);
    });

    // S-1094：播放中父層每秒 re-render 傳新 array，唔可以每次喺 render 期間 set state 多 render 一次
    it('should not render twice when the parent passes a new array while open', () => {
        const { rerender, renders } = hold({ value: ['a'], open: true });
        const before = renders();
        rerender({ value: ['a'], open: true });
        rerender({ value: ['a'], open: true });
        expect(renders() - before).toBe(2);
    });
});
