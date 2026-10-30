import { useEffect, useState, type RefObject } from 'react';

export interface ElementSize {
    width: number;
    height: number;
    /** 元素度嘅 --ui-scale（tokens.css；橫版大畫面放大），計 px 常數用 */
    uiScale: number;
}

/** 未量到 / 冇 ResizeObserver（jsdom）：闊高 0 */
const UNMEASURED: ElementSize = { width: 0, height: 0, uiScale: 1 };

const readUiScale = (el: HTMLElement): number =>
    Number.parseFloat(getComputedStyle(el).getPropertyValue('--ui-scale')) || 1;

/** 元素內容嘅闊高（clientWidth / clientHeight），跟住改大細（ResizeObserver） */
export const useElementSize = (ref: RefObject<HTMLElement | null>): ElementSize => {
    const [size, setSize] = useState(UNMEASURED);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => {
            setSize({ width: el.clientWidth, height: el.clientHeight, uiScale: readUiScale(el) });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref]);
    return size;
};
