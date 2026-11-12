/*
 * 月曆 popover 向下定向上（用戶 2026-11-12）：打開嗰刻（paint 之前）量欄位、popover 高度，
 * 同 viewport + 最近嘅捲動容器（例如內容區）比，下面唔夠位就向上（placementOf）；
 * 打開咗之後 resize / 任何捲動（capture，連內容區）都再量（S-838）
 */
import { useLayoutEffect, useState, type RefObject } from 'react';
import { placementOf } from './dateFieldModel';

const SCROLLS = /(auto|scroll)/;
/** 捲動唔會 bubble：用 capture 先收到內容區等容器嘅 scroll */
const CAPTURE = { capture: true, passive: true } as const;

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

export const usePopoverPlacement = (popRef: RefObject<HTMLElement | null>) => {
    const [placement, setPlacement] = useState<'down' | 'up'>('down');
    useLayoutEffect(() => {
        const measure = () => {
            const pop = popRef.current;
            const field = pop?.parentElement;
            if (!pop || !field) return;
            const box = field.getBoundingClientRect();
            setPlacement(
                placementOf(box, pop.getBoundingClientRect().height, visibleSpanOf(field)),
            );
        };
        measure();
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, CAPTURE);
        return () => {
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, CAPTURE);
        };
    }, [popRef]);
    return placement;
};
