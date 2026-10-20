import { ARC_SWEEP_DEGREES } from '../config/constants';

// 角度以螢幕座標計：0° 指向右，順時針為正（y 軸向下），同 arc.ts 一樣
const FULL_CIRCLE_DEGREES = 360;
const HALF_CIRCLE_DEGREES = FULL_CIRCLE_DEGREES / 2;
const RADIANS_TO_DEGREES = 180 / Math.PI;

/** 捽碟可以轉嘅範圍：由起手位置計，唔可以轉出錄音頭尾 */
export interface TurnRange {
    startSeconds: number;
    max: number;
    secondsPerTurn: number;
}

export const pointerAngle = (x: number, y: number, centerX: number, centerY: number): number =>
    Math.atan2(y - centerY, x - centerX) * RADIANS_TO_DEGREES;

/** 兩個角度之間最短嘅轉動（-180, 180]：跨過 ±180° 唔會當成轉咗成個圈 */
export const angleDelta = (from: number, to: number): number => {
    const delta = (to - from) % FULL_CIRCLE_DEGREES;
    if (delta > HALF_CIRCLE_DEGREES) return delta - FULL_CIRCLE_DEGREES;
    if (delta <= -HALF_CIRCLE_DEGREES) return delta + FULL_CIRCLE_DEGREES;
    return delta;
};

/** 轉咗幾多度 → 前進 / 後退幾多秒（順時針向前） */
export const turnSeconds = (degrees: number, secondsPerTurn: number): number =>
    (degrees / FULL_CIRCLE_DEGREES) * secondsPerTurn;

/** 轉到錄音頭尾就停：之後反方向轉即刻有反應，唔使先轉返超出咗嘅角度 */
export const clampTurn = (degrees: number, range: TurnRange): number => {
    const toDegrees = (seconds: number) => (seconds / range.secondsPerTurn) * FULL_CIRCLE_DEGREES;
    const min = toDegrees(-range.startSeconds);
    const max = toDegrees(range.max - range.startSeconds);
    return Math.min(max, Math.max(min, degrees));
};

/** 拖弧形時碟跟手指轉：弧形掃過幾多度，碟就轉幾多度 */
export const arcFollowDegrees = (deltaSeconds: number, max: number): number =>
    max > 0 ? (deltaSeconds / max) * ARC_SWEEP_DEGREES : 0;
