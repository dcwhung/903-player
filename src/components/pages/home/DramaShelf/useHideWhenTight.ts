import { useLayoutEffect, useRef } from 'react';

/**
 * 放唔落時加喺量度嘅元素度：CSS 成段收埋次要嘅一截（主頁格短篇數「N 個短篇 ·」、
 * 繼續收聽條嘅「· ⏳ 19/12 下架」），唔出半截 / 淨低分隔點
 */
export const TIGHT_ATTR = 'data-tight';

/** 放唔放得落（次要嗰截顯示緊嘅時候量）；要係 module 層面嘅 function（reference 穩定） */
export type Fits = (el: HTMLElement) => boolean;

/** 自己冇溢出：角落字（短篇數 + 上架字尾） */
export const fitsWithoutOverflow: Fits = (el) => el.scrollWidth <= el.clientWidth;

/** 先放返次要嗰截再量：仲係放唔落先收埋 */
const fit = (el: HTMLElement, fits: Fits) => {
    el.removeAttribute(TIGHT_ATTR);
    if (!fits(el)) el.setAttribute(TIGHT_ATTR, '');
};

/**
 * 主頁格嘅一行字：放唔落就成段收埋次要嗰截（W-533 跟進）。格變闊 / 變窄（ResizeObserver 睇
 * 上一層）、字型載完都重新量；直接改 DOM attribute，唔使 re-render。enabled = 有次要嗰截先需要
 */
export const useHideWhenTight = <T extends HTMLElement>(enabled: boolean, fits: Fits) => {
    const ref = useRef<T>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!enabled || !el) return undefined;
        const measure = () => fit(el, fits);
        measure();
        // 字型（Poppins）載完字會闊啲，再量一次
        void document.fonts?.ready.then(measure);
        // 冇 ResizeObserver（例如舊瀏覽器 / 測試環境）就淨係量一次
        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(el.parentElement ?? el);
        return () => observer.disconnect();
    }, [enabled, fits]);
    return ref;
};
