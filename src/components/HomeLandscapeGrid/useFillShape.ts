import type { RefObject } from 'react';
import { useElementSize } from '../../hooks/useElementSize';
import { fallbackShape, fillShape, type FillShape } from './fillShape';
import { FILL_SPACING_PX, MIN_CELL_PX } from './fillSpacing';

/**
 * 量 nav 嘅大細，揀橫額 + count 張卡嘅欄 × 行；未量到或者放唔落就用 fallbackShape。
 * layoutKey 一變（例如收埋播放卡）就喺同一個 commit 重新量（見 useElementSize）
 */
export const useFillShape = (
    ref: RefObject<HTMLElement | null>,
    count: number,
    tileRatio: number,
    layoutKey?: unknown,
): FillShape => {
    const { width, height, uiScale } = useElementSize(ref, layoutKey);
    const { gutter, tileGap, shadowPad, dots } = FILL_SPACING_PX;
    const box = { width: width - 2 * gutter * uiScale, height: height - shadowPad * uiScale };
    const options = {
        count,
        tileRatio,
        gapPx: tileGap * uiScale,
        minCellPx: MIN_CELL_PX * uiScale,
        dotsPx: dots * uiScale,
    };
    const measured = width > 0 && height > 0 ? fillShape(box, options) : null;
    return measured ?? fallbackShape(count + 1);
};
