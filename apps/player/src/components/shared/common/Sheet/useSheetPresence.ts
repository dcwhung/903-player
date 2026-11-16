import { useLayoutEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../../../utils/motion';

/**
 * 收埋動畫（SheetMotion.module.css，--view-transition-fade）完咗都未收到 finished 嘅後備時間：
 * 例如背景分頁唔跑動畫，表都唔會卡住
 */
export const SHEET_EXIT_FALLBACK_MS = 600;

/** overlay 嘅 data-sheet-state：SheetMotion.module.css 按佢播彈出 / 收埋 */
export type SheetState = 'open' | 'closing';

/** overlay 直屬子元素（遮罩、表）跑緊嘅動畫；jsdom / 舊瀏覽器冇 getAnimations 就當冇 */
const runningAnimations = (overlay: HTMLElement | null): Animation[] =>
    Array.from(overlay?.children ?? []).flatMap((el) =>
        typeof el.getAnimations === 'function' ? el.getAnimations() : [],
    );

/**
 * 等收埋動畫完先 finish（最多等 SHEET_EXIT_FALLBACK_MS）；冇動畫即刻 finish。返回 cleanup：
 * 再開（closing 變 false）會 cancel 動畫令 finished reject，cleanup 之後唔再 finish
 */
const waitForExit = (overlay: HTMLElement | null, onDone: () => void): (() => void) => {
    let settled = false;
    const finish = () => {
        if (settled) return;
        settled = true;
        onDone();
    };
    const running = runningAnimations(overlay);
    if (running.length === 0) finish();
    const timer = settled ? undefined : setTimeout(finish, SHEET_EXIT_FALLBACK_MS);
    Promise.all(running.map((animation) => animation.finished)).then(finish, () => undefined);
    return () => {
        settled = true;
        clearTimeout(timer);
    };
};

/**
 * 底部 sheet 嘅出現 / 消失（全集 ArcSheet、資料 ItemInfoSheet 共用，經 SheetOverlay）：
 * open → 'open'（CSS 由底滑上、遮罩淡入）；open 變 false → 'closing'（滑落、淡出），動畫完先 unmount。
 * 唔理點閂（✕、遮罩、Escape、撳左欄、拉走）都係父層改 open，所以全部行同一個收埋動畫。
 * 減少動態喺閂嗰刻先問（唔 cache）：要就即刻 unmount；冇動畫可等 / 等唔到都唔會卡住
 */
export const useSheetPresence = (open: boolean) => {
    const [prevOpen, setPrevOpen] = useState(open);
    const [mounted, setMounted] = useState(open);
    // render 期間跟 open 轉（React 建議做法），唔使等 effect 先多 render 一次
    if (open !== prevOpen) {
        setPrevOpen(open);
        setMounted(open || !prefersReducedMotion());
    }
    const closing = !open && mounted;
    const overlayRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (!closing) return undefined;
        return waitForExit(overlayRef.current, () => setMounted(false));
    }, [closing]);
    const state: SheetState = open ? 'open' : 'closing';
    // inert：滑走緊唔收 tap / 焦點（唔會撳到滑走緊嘅行 / 掣，撳遮罩都唔會再閂一次）
    return { mounted: open || mounted, state, inert: closing, overlayRef };
};

export type SheetPresence = ReturnType<typeof useSheetPresence>;
