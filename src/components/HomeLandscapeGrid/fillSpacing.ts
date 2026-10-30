/**
 * 填滿格計欄 × 行用嘅間距（未乘 --ui-scale 嘅 px）。CSS custom property 唔會 resolve calc()，
 * runtime 讀唔到 px，所以喺度寫一份，由 src/styles/fillSpacing.node.test.ts 對住 tokens.css 鎖住（S-635）
 */
export const FILL_SPACING_PX = {
    /** --home-gutter：格仔左右留白 */
    gutter: 16,
    /** --home-tile-gap：格距 */
    tileGap: 12,
    /** --space-2：格仔上下留畀泥膠落影嘅位 */
    shadowPad: 8,
    /** --touch-target-min：分頁時頁點高度 */
    dots: 24,
} as const;

/** 每格最少幾高（mockup MIN_CELL_H；再矮字同掣放唔落） */
export const MIN_CELL_PX = 120;

/** FILL_SPACING_PX 每項對應嘅 token */
export const FILL_SPACING_TOKENS: Readonly<Record<keyof typeof FILL_SPACING_PX, string>> = {
    gutter: '--home-gutter',
    tileGap: '--home-tile-gap',
    shadowPad: '--space-2',
    dots: '--touch-target-min',
};
