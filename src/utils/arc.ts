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

/** 弧形可以撳嘅範圍：離圓心 inner–outer 之間，底部缺口只留兩端少少容差（方便撳 0 / 尾嘅圓點） */
export interface ArcBand {
    inner: number;
    outer: number;
    gapTolerance: number;
}

/** 指標喺唔喺弧形觸控帶入面；唔喺就交返畀外面（今日節目卡疊 swipe） */
export const isOnArcBand = (x: number, y: number, center: number, band: ArcBand): boolean => {
    const distance = Math.hypot(x - center, y - center);
    if (!(distance >= band.inner && distance <= band.outer)) return false;
    const angle = Math.atan2(y - center, x - center) / DEGREES_TO_RADIANS;
    const offset = (angle - ARC_START_DEGREES + FULL_CIRCLE_DEGREES * 2) % FULL_CIRCLE_DEGREES;
    return (
        offset <= ARC_SWEEP_DEGREES + band.gapTolerance ||
        offset >= FULL_CIRCLE_DEGREES - band.gapTolerance
    );
};

/** 畫弧形用嘅 stroke-dasharray（circle 要 rotate 到 ARC_START_DEGREES） */
export const arcDashArray = (ratio: number, radius: number): string => {
    const circumference = 2 * Math.PI * radius;
    const visible = circumference * (ARC_SWEEP_DEGREES / FULL_CIRCLE_DEGREES) * clampRatio(ratio);
    return `${visible} ${circumference}`;
};

const HALF = 0.5;

/**
 * 拖動時防止喺底部缺口由尾跳返頭（或相反）：
 * 上一個位置喺後半段而新位置 snap 咗去 0，就維持喺 1；前半段同理。
 */
export const stabiliseDragRatio = (next: number, previous: number | null): number => {
    if (previous === null) {
        return next;
    }
    if (next === 0 && previous > HALF) {
        return 1;
    }
    if (next === 1 && previous < HALF) {
        return 0;
    }
    return next;
};
