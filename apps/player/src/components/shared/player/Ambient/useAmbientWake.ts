import { useCallback, useContext, useRef, useState, type RefObject } from 'react';
import { SleepTimerContext } from '../../../../player/sleepTimerContext';
import { prefersReducedMotion } from '../../../../utils/motion';

/**
 * 夜間程度（0 = 日間、1 = 全暗）：讀覆蓋層入面 data-ambient-night-level 元素而家嘅 opacity。
 * 佢同其他顏色用同一個 --ambient-night-fade 過場，淡入到一半叫醒都讀到當刻嘅暗度
 */
export const nightLevelOf = (element: HTMLElement | null): number => {
    if (!element) return 0;
    const level = Number.parseFloat(getComputedStyle(element).opacity);
    return Number.isFinite(level) ? level : 0;
};

export interface AmbientWake {
    /** 叫醒時記低嘅「時間到」（SleepTimerSnapshot.expiry.at）：之後再閒置唔再即刻暗 */
    acknowledgedExpiryAt: number | null;
    /** 叫醒遮罩由幾暗開始（0–1）；null = 冇遮罩 */
    veilFrom: number | null;
    /** 覆蓋層嘅夜間程度元素 */
    levelRef: RefObject<HTMLSpanElement | null>;
    /** 叫醒嗰下（覆蓋層未拆）：記低時間到、量暗度開遮罩 */
    onWake: () => void;
    /** 遮罩淡出完 */
    onVeilDone: () => void;
}

/**
 * 9c 叫醒（用戶 2026-11-20）：暗咗掂 mon → 返正常頁面，頁面上面一層 pointer-events: none 嘅暗色遮罩
 * 由當刻暗度 3 秒淡出（頁面即刻用得）。減少動態：喺叫醒嗰刻先睇設定，唔出遮罩
 */
export const useAmbientWake = (): AmbientWake => {
    const controller = useContext(SleepTimerContext);
    const levelRef = useRef<HTMLSpanElement | null>(null);
    const [acknowledgedExpiryAt, setAcknowledged] = useState<number | null>(null);
    const [veilFrom, setVeilFrom] = useState<number | null>(null);
    const onWake = useCallback(() => {
        setAcknowledged(controller?.getSnapshot().expiry?.at ?? null);
        const level = nightLevelOf(levelRef.current);
        setVeilFrom(level > 0 && !prefersReducedMotion() ? level : null);
    }, [controller]);
    const onVeilDone = useCallback(() => setVeilFrom(null), []);
    return { acknowledgedExpiryAt, veilFrom, levelRef, onWake, onVeilDone };
};
