import {
    ARC_SWEEP_DEGREES,
    DISC_SCRUB_FAST_DEGREES_PER_MS,
    DISC_SCRUB_MAX_SECONDS_PER_TURN,
    DISC_SCRUB_MIN_SECONDS_PER_TURN,
    DISC_SCRUB_SLOW_DEGREES_PER_MS,
} from '../config/constants';

// 角度以螢幕座標計：0° 指向右，順時針為正（y 軸向下），同 arc.ts 一樣
const FULL_CIRCLE_DEGREES = 360;
const HALF_CIRCLE_DEGREES = FULL_CIRCLE_DEGREES / 2;
const RADIANS_TO_DEGREES = 180 / Math.PI;

/** 捽碟一步：前進 / 後退到邊（秒）、碟面實際轉咗幾多度 */
export interface ScrubStep {
    seconds: number;
    degrees: number;
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

/** 手指轉速（度 / 毫秒）→ 每圈幾多秒：慢就微調，快就線性加速到上限 */
export const scrubSecondsPerTurn = (degreesPerMs: number): number => {
    const range = DISC_SCRUB_FAST_DEGREES_PER_MS - DISC_SCRUB_SLOW_DEGREES_PER_MS;
    const ratio = Math.min(1, Math.max(0, (degreesPerMs - DISC_SCRUB_SLOW_DEGREES_PER_MS) / range));
    return (
        DISC_SCRUB_MIN_SECONDS_PER_TURN +
        ratio * (DISC_SCRUB_MAX_SECONDS_PER_TURN - DISC_SCRUB_MIN_SECONDS_PER_TURN)
    );
};

/**
 * 由 seconds 轉 degrees：轉到錄音頭尾就停，碟面只轉實際行咗嘅角度，
 * 之後反方向轉即刻有反應，唔使先轉返超出咗嘅角度
 */
export const scrubStep = (
    seconds: number,
    degrees: number,
    secondsPerTurn: number,
    max: number,
): ScrubStep => {
    const next = Math.min(max, Math.max(0, seconds + turnSeconds(degrees, secondsPerTurn)));
    return { seconds: next, degrees: ((next - seconds) / secondsPerTurn) * FULL_CIRCLE_DEGREES };
};

/** 拖弧形時碟跟手指轉：弧形掃過幾多度，碟就轉幾多度 */
export const arcFollowDegrees = (deltaSeconds: number, max: number): number =>
    max > 0 ? (deltaSeconds / max) * ARC_SWEEP_DEGREES : 0;
