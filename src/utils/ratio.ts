/** 百分比嘅上限（aria-valuemax / CSS width） */
export const PERCENT = 100;

/** 進度比例 0–1；未知長度（0 / NaN）當 0 */
export const ratio = (position: number, duration: number): number =>
    duration > 0 ? Math.min(1, position / duration) : 0;

export const toPercent = (value: number): number => Math.round(value * PERCENT);
