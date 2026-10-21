/** 跑馬燈每秒捲幾多 px（慢到讀得切） */
export const MARQUEE_SPEED_PX_PER_S = 30;
/** 一份文字尾同下一份文字頭之間嘅空位 */
export const MARQUEE_GAP_PX = 32;
const MS_PER_S = 1000;

/** 一個循環捲幾遠：一份文字 + 空位，捲完下一份就啱啱到第一份開始嘅位置（無縫） */
export const marqueeDistancePx = (textWidthPx: number): number => textWidthPx + MARQUEE_GAP_PX;

/** 一個循環幾耐：固定速度 */
export const marqueeDurationMs = (distancePx: number): number =>
    Math.round((distancePx / MARQUEE_SPEED_PX_PER_S) * MS_PER_S);
