import { useEffect, useState, type RefObject } from 'react';

/** 捲動位置嘅小數誤差（縮放 / 高 DPR 時 scrollLeft 唔係整數） */
const EDGE_EPSILON_PX = 1;

interface EdgeFade {
    start: boolean;
    end: boolean;
}

const NO_FADE: EdgeFade = { start: false, end: false };

const readFade = (list: HTMLElement): EdgeFade => {
    const { scrollLeft, scrollWidth, clientWidth } = list;
    return {
        start: scrollLeft > EDGE_EPSILON_PX,
        end: scrollLeft + clientWidth < scrollWidth - EDGE_EPSILON_PX,
    };
};

/**
 * 捲動提示（用戶 2026-11-18）：邊一邊仲有格（捲得過去）就嗰邊淡出；捲到盡 / 放得晒就冇。
 * 捲動、改視窗大細（ResizeObserver + resize）、格數變都重新計；淡出本身冇動畫，唔使理減少動態
 */
export const useEdgeFade = (listRef: RefObject<HTMLUListElement | null>, count: number) => {
    const [fade, setFade] = useState(NO_FADE);
    useEffect(() => {
        const list = listRef.current;
        if (!list) return undefined;
        const update = () => {
            const next = readFade(list);
            setFade((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
        };
        update();
        list.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
        observer?.observe(list);
        return () => {
            list.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
            observer?.disconnect();
        };
    }, [listRef, count]);
    return fade;
};
