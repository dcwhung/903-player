import { useLayoutEffect, useRef } from 'react';
import { applyFit } from './fitText';

/**
 * 令一行文字（white-space: nowrap）按格闊自動縮細字體，完整顯示唔省略。
 * 入面有 Marquee（自己收埋溢出）就量 Marquee 嘅文字（[data-marquee-text]）闊度，唔係格本身。
 * 文字改咗、格闊變咗（ResizeObserver，例如轉向）、字型載完都會重新量（見 applyFit）。
 * 冇 ResizeObserver / document.fonts（jsdom）就只喺文字改時量
 */
export const useFitText = <T extends HTMLElement>(text: string, minPx: number) => {
    const ref = useRef<T>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        let active = true;
        const content = el.querySelector<HTMLElement>('[data-marquee-text]') ?? el;
        const fit = () => {
            if (active) applyFit(el, content, minPx);
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
