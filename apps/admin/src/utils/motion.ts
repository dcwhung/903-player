const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * 用戶喺系統設定要求減少動畫（jsdom / 舊瀏覽器冇 matchMedia 就當唔要求）。
 * 同 player apps/player/src/utils/motion.ts 一樣：動畫開始嗰刻先叫，唔好 cache
 */
export const prefersReducedMotion = (): boolean =>
    typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches;

/** scrollIntoView 用：減少動畫就直接跳過去 */
export const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');

const MS_PER_S = 1000;

/** CSS 時間 → ms（build 會將 220ms 壓成 .22s，兩種都要識） */
export const durationMs = (value: string): number | undefined => {
    const text = value.trim();
    const number = Number.parseFloat(text);
    if (!Number.isFinite(number)) return undefined;
    if (text.endsWith('ms')) return number;
    return text.endsWith('s') ? number * MS_PER_S : undefined;
};

export type MotionToken = '--motion-fast' | '--motion-base' | '--motion-move';

export interface MotionTiming {
    duration: number;
    easing: string;
}

/**
 * JS 動畫（Web Animations / dnd-kit）嘅時間：讀 tokens.css 嘅 --motion-* 同 --motion-ease，
 * 唔喺 JS 抄一份數字（S-806）。冇 token（CSS 未載）就唔郁（0ms），唔會卡住
 */
export const motionTiming = (token: MotionToken): MotionTiming => {
    const style = getComputedStyle(document.documentElement);
    const easing = style.getPropertyValue('--motion-ease').trim();
    return {
        duration: durationMs(style.getPropertyValue(token)) ?? 0,
        easing: easing || 'linear',
    };
};
