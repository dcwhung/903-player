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

/**
 * 量一次再縮：先清走之前設嘅字體，用 CSS 原本大小量 content（Marquee 文字或者格本身）闊度；
 * 按比例縮完仍然有捨入誤差，就逐步再細 FIT_STEP_PX，直至放得落或者到 minPx
 */
export const applyFit = (el: HTMLElement, content: HTMLElement, minPx: number) => {
    el.style.fontSize = '';
    const basePx = parseFloat(getComputedStyle(el).fontSize);
    if (!Number.isFinite(basePx)) return;
    let size = fitFontSize({
        basePx,
        availablePx: el.clientWidth,
        neededPx: content.scrollWidth,
        minPx,
    });
    if (size === basePx) return;
    el.style.fontSize = `${size}px`;
    while (content.scrollWidth > el.clientWidth && size - FIT_STEP_PX >= minPx) {
        size -= FIT_STEP_PX;
        el.style.fontSize = `${size}px`;
    }
};
