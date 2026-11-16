/*
 * 月曆 popover 向下定向上（用戶 2026-11-12）：打開嗰刻（paint 之前）量欄位、popover 高度，
 * 同 viewport + 最近嘅捲動容器（例如內容區）比，下面唔夠位就向上（placementOf）；
 * 打開咗之後 resize / 任何捲動（capture，連內容區）都再量（S-838）：每格 frame 最多量一次，
 * 換方向有緩衝，臨界位附近捲動唔會閃（S-859）。冇動畫，直接換位
 */
import { useLayoutEffect, useState, type RefObject } from 'react';
import { placementOf, type Placement } from './dateFieldModel';

const SCROLLS = /(auto|scroll)/;
/** 捲動唔會 bubble：用 capture 先收到內容區等容器嘅 scroll */
const CAPTURE = { capture: true, passive: true } as const;
/** 冇排緊 frame */
const NO_FRAME = 0;

/** 可見範圍：viewport 同所有會捲 / 會裁走內容嘅祖先取交集 */
const visibleSpanOf = (el: HTMLElement) => {
    let top = 0;
    let bottom = window.innerHeight;
    for (let node = el.parentElement; node; node = node.parentElement) {
        if (!SCROLLS.test(getComputedStyle(node).overflowY)) continue;
        const rect = node.getBoundingClientRect();
        top = Math.max(top, rect.top);
        bottom = Math.min(bottom, rect.bottom);
    }
    return { top, bottom };
};

/** 量一次：未有方向（啱啱打開）= 冇緩衝；量唔到（未 mount）= undefined */
const measure = (pop: HTMLElement | null, current: Placement | undefined) => {
    const field = pop?.parentElement;
    if (!pop || !field) return undefined;
    const box = field.getBoundingClientRect();
    return placementOf(box, pop.getBoundingClientRect().height, visibleSpanOf(field), current);
};

export const usePopoverPlacement = (popRef: RefObject<HTMLElement | null>) => {
    const [placement, setPlacement] = useState<Placement>('down');
    useLayoutEffect(() => {
        let current: Placement | undefined;
        let frame = NO_FRAME;
        const place = () => {
            frame = NO_FRAME;
            current = measure(popRef.current, current) ?? current;
            if (current) setPlacement(current);
        };
        /** 同一格 frame 嘅 scroll / resize 併埋一次量（S-859） */
        const schedule = () => {
            if (frame === NO_FRAME) frame = requestAnimationFrame(place);
        };
        place();
        window.addEventListener('resize', schedule);
        window.addEventListener('scroll', schedule, CAPTURE);
        return () => {
            window.removeEventListener('resize', schedule);
            window.removeEventListener('scroll', schedule, CAPTURE);
            if (frame !== NO_FRAME) cancelAnimationFrame(frame);
        };
    }, [popRef]);
    return placement;
};
