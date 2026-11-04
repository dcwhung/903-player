import { useRef } from 'react';

/** 隱藏 viewport debug：版本號連撳幾多下、要喺幾耐之內（用戶批准） */
export const DEBUG_TAP_COUNT = 5;
export const DEBUG_TAP_WINDOW_MS = 2000;

interface TapResult {
    /** 仲計緊嘅撳（時間，ms） */
    taps: number[];
    fired: boolean;
}

/**
 * 記低一下撳：只計最近 windowMs 之內嘅；夠 count 下就觸發，清零重新計。
 * 撳一下乜都唔做（唔會影響平時撳版本號 / 橫額）
 */
export const recordTap = (
    taps: readonly number[],
    now: number,
    count = DEBUG_TAP_COUNT,
    windowMs = DEBUG_TAP_WINDOW_MS,
): TapResult => {
    const recent = [...taps.filter((time) => now - time < windowMs), now];
    return recent.length >= count ? { taps: [], fired: true } : { taps: recent, fired: false };
};

/** 連撳手勢：返回 onClick，夠數就叫 onFire */
export const useTapGesture = (onFire: () => void) => {
    const tapsRef = useRef<number[]>([]);
    return () => {
        const { taps, fired } = recordTap(tapsRef.current, Date.now());
        tapsRef.current = taps;
        if (fired) onFire();
    };
};
