/** 跑馬燈每秒捲幾多 px（慢到讀得切） */
export const MARQUEE_SPEED_PX_PER_S = 30;
/**
 * 一程（去或者返）入面真正捲動佔幾多；其餘時間兩頭停低等人讀。
 * 要同 Marquee.module.css 嘅 @keyframes 百分比一致（20% → 80%）
 */
export const MARQUEE_TRAVEL_SHARE = 0.6;
const MS_PER_S = 1000;

/** 一程跑馬燈幾耐：捲動用固定速度，再按比例加返兩頭停留 */
export const marqueeDurationMs = (overflowPx: number): number =>
    Math.round(((overflowPx / MARQUEE_SPEED_PX_PER_S) * MS_PER_S) / MARQUEE_TRAVEL_SHARE);
