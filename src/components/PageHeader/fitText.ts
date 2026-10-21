/** 字體每次縮細嘅步距（px）：細過呢個肉眼睇唔出分別 */
export const FIT_STEP_PX = 0.5;

interface FitInput {
    /** CSS 原本嘅字體大小 */
    basePx: number;
    /** 標題格有幾闊 */
    availablePx: number;
    /** 用原本字體大小時文字要幾闊 */
    neededPx: number;
    /** 最細縮到幾細；再放唔落就由 CSS 省略號處理 */
    minPx: number;
}

/**
 * 一行放得落嘅字體大小：文字闊度大致同字體大小成正比，按比例縮細，
 * 向下取到 FIT_STEP_PX 嘅倍數（寧願細少少都唔好剪字），唔會大過原本或者細過最細
 */
export const fitFontSize = ({ basePx, availablePx, neededPx, minPx }: FitInput): number => {
    if (neededPx <= availablePx || neededPx <= 0) return basePx;
    const scaled = Math.floor((basePx * availablePx) / neededPx / FIT_STEP_PX) * FIT_STEP_PX;
    return Math.min(basePx, Math.max(minPx, scaled));
};
