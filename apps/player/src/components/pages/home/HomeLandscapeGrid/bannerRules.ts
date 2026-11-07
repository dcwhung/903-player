import { SCREEN_MAX_CARDS } from './landscapeLayout';

/** standard = banner.webp（1200 × 517）；long = banner-wide.webp（2000 × 400，左右延長咗雲） */
export type BannerImage = 'standard' | 'long';

/**
 * contain = 見晒成張；height = 放大到同格一樣高（左右可能裁走）；width = 放大到同格一樣闊（上下可能裁走）。
 * 剩低嘅位用圖邊顏色補（見 bannerEdges）
 */
export type BannerFit = 'contain' | 'height' | 'width';

export interface BannerRule {
    image: BannerImage;
    fit: BannerFit;
    /** 成張圖向下 / 向右移幾多 CSS px（另一邊露出嘅位都補邊色） */
    shiftDownPx: number;
    shiftRightPx: number;
}

/** 自動揀（冇指定嘅卡數）：格扁過呢個比例先用長版 */
export const LONG_BANNER_MIN_RATIO = 3.5;

const SHIFT_1_OFF_RIGHT_PX = 20;
const SHIFT_3_ON_DOWN_PX = 12;
const SHIFT_7_OFF_RIGHT_PX = 8;

const rule = (image: BannerImage, fit: BannerFit, shiftDownPx = 0, shiftRightPx = 0) => ({
    image,
    fit,
    shiftDownPx,
    shiftRightPx,
});

/**
 * 每個卡數 × 有冇 mini player 用邊張橫額、點放大、移幾多（用戶喺 prototype T7 逐個睇過揀定）。
 * 冇列出嘅卡數（2 張、0 張）自動揀，見 autoRule
 */
const BANNER_RULES: Readonly<Record<number, { off: BannerRule; on: BannerRule }>> = {
    1: { off: rule('standard', 'height', 0, SHIFT_1_OFF_RIGHT_PX), on: rule('standard', 'height') },
    3: { off: rule('long', 'width'), on: rule('long', 'width', SHIFT_3_ON_DOWN_PX) },
    4: { off: rule('long', 'height'), on: rule('long', 'width') },
    5: { off: rule('standard', 'height'), on: rule('long', 'height') },
    6: { off: rule('long', 'height'), on: rule('long', 'height') },
    7: { off: rule('standard', 'height', 0, SHIFT_7_OFF_RIGHT_PX), on: rule('standard', 'height') },
    8: { off: rule('standard', 'width'), on: rule('long', 'height') },
};

/** 見晒成張；格好扁先換長版（未量到尺寸 NaN 當一般格） */
const autoRule = (cellRatio: number): BannerRule =>
    rule(cellRatio >= LONG_BANNER_MIN_RATIO ? 'long' : 'standard', 'contain');

/**
 * 手機打橫主頁橫額格點畫：count = 卡數（唔計橫額），9 張起同 8 張一樣（橫額同一個位）；
 * cellRatio = 橫額格闊 ÷ 高（自動揀先用到）
 */
export const bannerRule = (count: number, miniPlayer: boolean, cellRatio: number): BannerRule => {
    const rules = BANNER_RULES[Math.min(count, SCREEN_MAX_CARDS)];
    if (!rules) return autoRule(cellRatio);
    return miniPlayer ? rules.on : rules.off;
};
