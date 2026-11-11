/*
 * Tooltip 位置（純計算）：Design Origin: mockup: _mockups_/admin-style/index.html#d（泡泡 + 箭咀）
 * 先試想要嘅一邊（上 / 右），冇位就翻去對面；再喺 bounds（視窗，內容區嘅 tooltip 左邊界 = nav 右邊）
 * 入面滑返入嚟，箭咀保持指住 anchor
 */

export interface Box {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export type TipSide = 'top' | 'bottom' | 'right' | 'left';

export interface TipPlacement {
    side: TipSide;
    x: number;
    y: number;
    /** 箭咀喺泡泡入面嘅位置（top / bottom = 由左計；left / right = 由頂計） */
    arrow: number;
}

/** 泡泡同 anchor 之間（箭咀 7px + 空位） */
export const TIP_GAP = 10;
/** 泡泡同 bounds 邊至少留嘅位 */
export const TIP_MARGIN = 8;
/** 箭咀唔好貼住泡泡圓角 */
const ARROW_INSET = 12;

const OPPOSITE: Record<TipSide, TipSide> = {
    top: 'bottom',
    bottom: 'top',
    right: 'left',
    left: 'right',
};

const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), Math.max(min, max));

const fits = (
    side: TipSide,
    anchor: Box,
    size: { width: number; height: number },
    bounds: Box,
): boolean => {
    if (side === 'top') return anchor.top - TIP_GAP - size.height >= bounds.top + TIP_MARGIN;
    if (side === 'bottom')
        return anchor.bottom + TIP_GAP + size.height <= bounds.bottom - TIP_MARGIN;
    if (side === 'right') return anchor.right + TIP_GAP + size.width <= bounds.right - TIP_MARGIN;
    return anchor.left - TIP_GAP - size.width >= bounds.left + TIP_MARGIN;
};

export const placeTooltip = (
    anchor: Box,
    size: { width: number; height: number },
    bounds: Box,
    preferred: TipSide = 'top',
): TipPlacement => {
    const side = fits(preferred, anchor, size, bounds) ? preferred : OPPOSITE[preferred];
    if (side === 'top' || side === 'bottom') {
        const centre = (anchor.left + anchor.right) / 2;
        const x = clamp(
            centre - size.width / 2,
            bounds.left + TIP_MARGIN,
            bounds.right - TIP_MARGIN - size.width,
        );
        const y = side === 'top' ? anchor.top - TIP_GAP - size.height : anchor.bottom + TIP_GAP;
        return { side, x, y, arrow: clamp(centre - x, ARROW_INSET, size.width - ARROW_INSET) };
    }
    const middle = (anchor.top + anchor.bottom) / 2;
    const y = clamp(
        middle - size.height / 2,
        bounds.top + TIP_MARGIN,
        bounds.bottom - TIP_MARGIN - size.height,
    );
    const x = side === 'right' ? anchor.right + TIP_GAP : anchor.left - TIP_GAP - size.width;
    return { side, x, y, arrow: clamp(middle - y, ARROW_INSET, size.height - ARROW_INSET) };
};
