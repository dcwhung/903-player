import { ARC_START_DEGREES, ARC_SWEEP_DEGREES } from '../config/constants';

// 角度以 SVG 座標計：0° 指向右，順時針為正（y 軸向下）
const FULL_CIRCLE_DEGREES = 360;
const DEGREES_TO_RADIANS = Math.PI / 180;
const GAP_DEGREES = FULL_CIRCLE_DEGREES - ARC_SWEEP_DEGREES;

export interface Point {
    x: number;
    y: number;
}

const clampRatio = (ratio: number): number => Math.min(1, Math.max(0, ratio));

export const ratioToPoint = (ratio: number, center: number, radius: number): Point => {
    const radians =
        (ARC_START_DEGREES + clampRatio(ratio) * ARC_SWEEP_DEGREES) * DEGREES_TO_RADIANS;
    return { x: center + radius * Math.cos(radians), y: center + radius * Math.sin(radians) };
};

/** 由指標位置計返 ratio；落喺底部缺口就 snap 去最近嗰一端 */
export const pointToRatio = (x: number, y: number, center: number): number => {
    const angle = Math.atan2(y - center, x - center) / DEGREES_TO_RADIANS;
    const offset = (angle - ARC_START_DEGREES + FULL_CIRCLE_DEGREES * 2) % FULL_CIRCLE_DEGREES;
    if (offset <= ARC_SWEEP_DEGREES) {
        return offset / ARC_SWEEP_DEGREES;
    }
    return offset < ARC_SWEEP_DEGREES + GAP_DEGREES / 2 ? 1 : 0;
};

/** 畫弧形用嘅 stroke-dasharray（circle 要 rotate 到 ARC_START_DEGREES） */
export const arcDashArray = (ratio: number, radius: number): string => {
    const circumference = 2 * Math.PI * radius;
    const visible = circumference * (ARC_SWEEP_DEGREES / FULL_CIRCLE_DEGREES) * clampRatio(ratio);
    return `${visible} ${circumference}`;
};
