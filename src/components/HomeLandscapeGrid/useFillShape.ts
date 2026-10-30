import type { RefObject } from 'react';
import { useElementSize } from '../../hooks/useElementSize';
import { fallbackShape, fillShape, type FillShape } from './fillShape';

/**
 * 以下 px 同 tokens.css 一樣（× --ui-scale）：--home-gutter、--home-tile-gap、
 * 格仔上下留畀泥膠落影嘅 --space-2、頁點 --touch-target-min。每格最矮 120px（mockup MIN_CELL_H）
 */
const GUTTER_PX = 16;
const TILE_GAP_PX = 12;
const SHADOW_PAD_PX = 8;
const DOTS_PX = 24;
const MIN_CELL_PX = 120;

/** 量 nav 嘅大細，揀橫額 + count 張卡嘅欄 × 行；未量到或者放唔落就用 fallbackShape */
export const useFillShape = (
    ref: RefObject<HTMLElement | null>,
    count: number,
    tileRatio: number,
): FillShape => {
    const { width, height, uiScale } = useElementSize(ref);
    const box = {
        width: width - 2 * GUTTER_PX * uiScale,
        height: height - SHADOW_PAD_PX * uiScale,
    };
    const options = {
        count,
        tileRatio,
        gapPx: TILE_GAP_PX * uiScale,
        minCellPx: MIN_CELL_PX * uiScale,
        dotsPx: DOTS_PX * uiScale,
    };
    const measured = width > 0 && height > 0 ? fillShape(box, options) : null;
    return measured ?? fallbackShape(count + 1);
};
