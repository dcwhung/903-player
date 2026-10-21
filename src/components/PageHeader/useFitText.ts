import { useLayoutEffect, useRef } from 'react';
import { FIT_STEP_PX, fitFontSize } from './fitText';

/**
 * 令一行文字（white-space: nowrap）按格闊自動縮細字體，完整顯示唔省略。
 * 文字改咗、格闊變咗（ResizeObserver，例如轉向）、字型載完都會重新量；
 * 按比例縮完仍然有捨入誤差，就逐步再細 FIT_STEP_PX，直至放得落或者到 minPx。
 * 冇 ResizeObserver / document.fonts（jsdom）就只喺文字改時量
 */
export const useFitText = <T extends HTMLElement>(text: string, minPx: number) => {
    const ref = useRef<T>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        let active = true;
        const fit = () => {
            if (!active) return;
            el.style.fontSize = '';
            const basePx = parseFloat(getComputedStyle(el).fontSize);
            if (!Number.isFinite(basePx)) return;
            let size = fitFontSize({
                basePx,
                availablePx: el.clientWidth,
                neededPx: el.scrollWidth,
                minPx,
            });
            if (size === basePx) return;
            el.style.fontSize = `${size}px`;
            while (el.scrollWidth > el.clientWidth && size - FIT_STEP_PX >= minPx) {
                size -= FIT_STEP_PX;
                el.style.fontSize = `${size}px`;
            }
        };
        fit();
        void document.fonts?.ready.then(fit);
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
        observer?.observe(el);
        return () => {
            active = false;
            observer?.disconnect();
        };
    }, [text, minPx]);
    return ref;
};
