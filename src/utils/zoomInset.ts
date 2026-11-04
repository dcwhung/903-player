/** 格仔框距離 viewport 四邊幾遠（px）：clip-path inset() 用 */
export interface ZoomInset {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface ViewportSize {
    width: number;
    height: number;
}

type Box = Pick<DOMRectReadOnly, 'top' | 'right' | 'bottom' | 'left'>;

/**
 * 格仔（getBoundingClientRect）喺 viewport 入面嘅框（Z3 card zoom 開窗嘅起點 / 終點）。
 * 凸出 viewport 嘅邊當貼邊；完全唔交疊（或者冇大細）就冇得 zoom，回 null
 */
export const zoomInset = (rect: Box, viewport: ViewportSize): ZoomInset | null => {
    const overlaps =
        rect.right > 0 &&
        rect.bottom > 0 &&
        rect.left < viewport.width &&
        rect.top < viewport.height &&
        rect.right > rect.left &&
        rect.bottom > rect.top;
    if (!overlaps) return null;
    return {
        top: Math.max(0, rect.top),
        right: Math.max(0, viewport.width - rect.right),
        bottom: Math.max(0, viewport.height - rect.bottom),
        left: Math.max(0, rect.left),
    };
};
