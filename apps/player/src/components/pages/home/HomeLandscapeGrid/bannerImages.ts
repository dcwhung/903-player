import longBanner from '../../../../assets/banner-wide.webp';
import standardBanner from '../../../../assets/banner.webp';
import { activeBanner } from '../../../../catalog/runtime';
import type { BannerImage } from './bannerRules';

interface BannerSource {
    src: string;
    /** 原圖闊 × 高（CSS 未載入圖都要計到幾大；bannerImages.node.test.ts 對住檔案鎖住） */
    width: number;
    height: number;
}

/** 同 packages/catalog ASSET_DIMENSIONS 嘅 bannerStandard / bannerLong 一致：catalog banner 都係呢個尺寸 */
const STANDARD_WIDTH = 1200;
const STANDARD_HEIGHT = 517;
const LONG_WIDTH = 2000;
const LONG_HEIGHT = 400;

/** src/assets 內建兩張圖（catalog 冇 banner 時用） */
const BUILT_IN_SRC: Readonly<Record<BannerImage, string>> = {
    standard: standardBanner,
    long: longBanner,
};

/**
 * 首頁橫額兩張圖（Phase 4）：catalog 有 banner 就用（remote → prebuild snapshot，見 catalog/runtime.ts），
 * 冇就用內建圖。尺寸鎖死，所以闊高比例唔使睇係邊個 source
 */
export const bannerImages = (): Readonly<Record<BannerImage, BannerSource>> => {
    const src = activeBanner() ?? BUILT_IN_SRC;
    return {
        standard: { src: src.standard, width: STANDARD_WIDTH, height: STANDARD_HEIGHT },
        long: { src: src.long, width: LONG_WIDTH, height: LONG_HEIGHT },
    };
};
