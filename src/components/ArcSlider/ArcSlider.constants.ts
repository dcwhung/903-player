/** SVG viewBox 尺寸，同 mockup 一致 */
export const VIEWBOX_SIZE = 300;
export const CENTER = VIEWBOX_SIZE / 2;
export const RADIUS = 140;
export const STROKE_WIDTH = 6;
export const THUMB_RADIUS = 9;

/** 弧形觸控帶闊度（每邊）：圓環以外（唱片格四角、碟）交返畀今日節目卡疊 swipe / 捽碟 */
const ARC_HIT_HALF_WIDTH = 28;
/** 底部缺口兩端容差：圓點喺 0 / 尾時半粒會突入缺口，照樣撳得中 */
const ARC_HIT_GAP_TOLERANCE_DEGREES = 12;

export const ARC_HIT_BAND = {
    inner: RADIUS - ARC_HIT_HALF_WIDTH,
    outer: RADIUS + ARC_HIT_HALF_WIDTH,
    gapTolerance: ARC_HIT_GAP_TOLERANCE_DEGREES,
};
