import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

export interface ElementSize {
    width: number;
    height: number;
    /** 元素度嘅 --ui-scale（tokens.css；橫版大畫面放大），計 px 常數用 */
    uiScale: number;
}

/** 未量到 / 冇元素：闊高 0 */
const UNMEASURED: ElementSize = { width: 0, height: 0, uiScale: 1 };

const readUiScale = (el: HTMLElement): number =>
    Number.parseFloat(getComputedStyle(el).getPropertyValue('--ui-scale')) || 1;

const measure = (el: HTMLElement): ElementSize => ({
    width: el.clientWidth,
    height: el.clientHeight,
    uiScale: readUiScale(el),
});

const sameSize = (a: ElementSize, b: ElementSize) =>
    a.width === b.width && a.height === b.height && a.uiScale === b.uiScale;

type SetSize = (update: (prev: ElementSize) => ElementSize) => void;

/** 量一次；大細冇變就保留舊 object（React 唔會 re-render） */
const remeasure = (el: HTMLElement, setSize: SetSize) => {
    const next = measure(el);
    setSize((prev) => (sameSize(prev, next) ? prev : next));
};

/**
 * 元素內容嘅闊高（clientWidth / clientHeight）。
 * 第一次畫同 layoutKey 一變就喺 layout effect 同步量（W-515）：View Transitions 嘅 flushSync
 * 影新畫面之前已經係啱嘅大細，唔會閃 fallback；大細冇變就唔 setState。
 * layoutKey = 會改變呢個元素大細嘅 React 狀態（例如主頁版面模式）；
 * ResizeObserver 跟 React 以外嘅轉大細（轉向、改視窗）
 */
export const useElementSize = (
    ref: RefObject<HTMLElement | null>,
    layoutKey?: unknown,
): ElementSize => {
    const [size, setSize] = useState(UNMEASURED);
    useLayoutEffect(() => {
        if (ref.current) remeasure(ref.current, setSize);
    }, [ref, layoutKey]);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => remeasure(el, setSize));
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref]);
    return size;
};
