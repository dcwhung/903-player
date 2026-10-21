import { useLayoutEffect, useRef, useState } from 'react';

/**
 * 量 box 入面嘅文字（第一個子元素，inline-block）多出幾多 px：track.scrollWidth − box.clientWidth，最少 0。
 * 文字改咗、box / 文字尺寸變咗（ResizeObserver）、字型載完（字型未到時字較窄）都會重新量；
 * 冇 ResizeObserver / document.fonts（jsdom）就只喺文字改時量
 */
export const useOverflow = (text: string) => {
    const boxRef = useRef<HTMLSpanElement>(null);
    const [overflowPx, setOverflowPx] = useState(0);
    useLayoutEffect(() => {
        const box = boxRef.current;
        const track = box?.firstElementChild;
        if (!box || !track) return;
        let active = true;
        const measure = () => {
            if (active) setOverflowPx(Math.max(0, track.scrollWidth - box.clientWidth));
        };
        measure();
        void document.fonts?.ready.then(measure);
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
        observer?.observe(box);
        observer?.observe(track);
        return () => {
            active = false;
            observer?.disconnect();
        };
    }, [text]);
    return { boxRef, overflowPx };
};
