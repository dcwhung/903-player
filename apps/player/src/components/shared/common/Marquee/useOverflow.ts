import { useLayoutEffect, useRef, useState } from 'react';

/**
 * 量文字（textRef，inline-block）有幾闊、比 box 闊幾多。
 * 文字改咗、box / 文字尺寸變咗（ResizeObserver）、字型載完（字型未到時字較窄）都會重新量；
 * 冇 ResizeObserver / document.fonts（jsdom）就只喺文字改時量
 */
export const useOverflow = (text: string) => {
    const boxRef = useRef<HTMLSpanElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [size, setSize] = useState({ textWidthPx: 0, overflowPx: 0 });
    useLayoutEffect(() => {
        const box = boxRef.current;
        const textEl = textRef.current;
        if (!box || !textEl) return;
        let active = true;
        const measure = () => {
            if (!active) return;
            const textWidthPx = textEl.scrollWidth;
            setSize({ textWidthPx, overflowPx: Math.max(0, textWidthPx - box.clientWidth) });
        };
        measure();
        void document.fonts?.ready.then(measure);
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
        observer?.observe(box);
        observer?.observe(textEl);
        return () => {
            active = false;
            observer?.disconnect();
        };
    }, [text]);
    return { boxRef, textRef, ...size };
};
