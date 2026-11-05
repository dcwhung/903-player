import { useLayoutEffect, useRef } from 'react';

/** 角落字（短篇數 + 上架字尾）放唔落時加呢個 attribute：CSS 成段收埋「N 個短篇 ·」 */
export const COUNT_HIDDEN_ATTR = 'data-count-hidden';

/** 先放返短篇數再量：仲係放唔落（scrollWidth > clientWidth）先收埋，唔會出半截 */
const fitCount = (meta: HTMLElement) => {
    meta.removeAttribute(COUNT_HIDDEN_ATTR);
    if (meta.scrollWidth > meta.clientWidth) meta.setAttribute(COUNT_HIDDEN_ATTR, '');
};

/**
 * 主頁格角落字（W-533）：有上架字尾時，短篇數要麼成段「N 個短篇 ·」出齊，要麼成段收埋。
 * 格變闊 / 變窄（ResizeObserver 睇格）都重新量；直接改 DOM attribute，唔使 re-render。
 * enabled = 有上架字尾先需要
 */
export const useTightCount = <T extends HTMLElement>(enabled: boolean) => {
    const ref = useRef<T>(null);
    useLayoutEffect(() => {
        const meta = ref.current;
        if (!enabled || !meta) return undefined;
        fitCount(meta);
        // 字型（Poppins）載完字會闊啲，再量一次
        void document.fonts?.ready.then(() => fitCount(meta));
        // 冇 ResizeObserver（例如舊瀏覽器 / 測試環境）就淨係量一次
        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(() => fitCount(meta));
        observer.observe(meta.parentElement ?? meta);
        return () => observer.disconnect();
    }, [enabled]);
    return ref;
};
