/*
 * 閒置畫面（9b）唱片外面嘅播放進度圈幾何（_mockups_/home-view-ambient 第 3 輪：viewBox 100、粗 2.4）。
 * 同 MiniPlayerProgress 一樣用圓周算 dasharray（唔用 pathLength），由 12 點順時針
 */
export const VIEW_BOX_SIZE = 100;
export const RING_WIDTH = 2.4;
export const CENTER = VIEW_BOX_SIZE / 2;
export const RADIUS = CENTER - RING_WIDTH / 2;
export const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** dasharray 小數留兩個位 */
export const DASH_DECIMALS = 2;
/** 由 3 點（SVG 圓起點）轉去 12 點，之後順時針 */
export const START_AT_TOP = `rotate(-90 ${CENTER} ${CENTER})`;
