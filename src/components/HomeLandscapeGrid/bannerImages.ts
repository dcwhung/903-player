import longBanner from '../../assets/banner-wide.webp';
import standardBanner from '../../assets/banner.webp';
import type { BannerImage } from './bannerRules';

interface BannerSource {
    src: string;
    /** 原圖闊 × 高（CSS 未載入圖都要計到幾大；bannerImages.node.test.ts 對住檔案鎖住） */
    width: number;
    height: number;
}

const STANDARD_WIDTH = 1200;
const STANDARD_HEIGHT = 517;
const LONG_WIDTH = 2000;
const LONG_HEIGHT = 400;

/** 手機打橫橫額格用嘅兩張圖 */
export const BANNER_IMAGES: Readonly<Record<BannerImage, BannerSource>> = {
    standard: { src: standardBanner, width: STANDARD_WIDTH, height: STANDARD_HEIGHT },
    long: { src: longBanner, width: LONG_WIDTH, height: LONG_HEIGHT },
};
