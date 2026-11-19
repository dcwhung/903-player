/*
 * mini player 播放掣外圈（MiniPlayerProgress）嘅幾何。
 * viewBox 用播放掣原本嘅格（--touch-target，44）；粗幼同 tokens.css 嘅 --mini-progress-ring 一致，
 * 成個 SVG 跟 --ui-scale 縮放，圈同 CSS 留嘅位（.toggle padding）一齊放大（miniPlayerRing.node.test 鎖住）
 */
export const VIEW_BOX_SIZE = 44;
export const RING_WIDTH = 3;
export const CENTER = VIEW_BOX_SIZE / 2;
export const RADIUS = CENTER - RING_WIDTH / 2;
/** 圓周（唔用 pathLength：舊版 iOS Safari 對 circle 嘅 pathLength 計 dash 唔準） */
export const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** dasharray 小數留兩個位，每秒更新唔使出長串數字 */
export const DASH_DECIMALS = 2;
/** 由 3 點（SVG 圓起點）轉去 12 點，之後順時針 */
export const START_AT_TOP = `rotate(-90 ${CENTER} ${CENTER})`;
