const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** 用戶喺系統設定要求減少動畫（jsdom / 舊瀏覽器冇 matchMedia 就當唔要求） */
export const prefersReducedMotion = (): boolean =>
    typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches;

/** scrollIntoView 用：減少動畫就直接跳過去 */
export const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');
