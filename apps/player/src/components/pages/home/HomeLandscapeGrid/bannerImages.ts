import { ASSET_DIMENSIONS, type AssetSize } from '@903-player/catalog';
import longBanner from '../../../../assets/banner-wide.webp';
import standardBanner from '../../../../assets/banner.webp';
import { activeBanner } from '../../../../catalog/runtime';
import type { BannerImage } from './bannerRules';

/** src + 原圖闊 × 高（CSS 未載入圖都要計到幾大；bannerImages.node.test.ts 對住內建圖檔鎖住） */
interface BannerSource extends AssetSize {
    src: string;
}

interface BannerImagesOptions {
    /** 就算 catalog 有 banner 都用內建圖（catalog 圖載入失敗後，見 useBannerImages） */
    builtIn?: boolean;
}

/** src/assets 內建兩張圖（catalog 冇 banner、或者 catalog 圖載入失敗時用） */
const BUILT_IN_SRC: Readonly<Record<BannerImage, string>> = {
    standard: standardBanner,
    long: longBanner,
};

/**
 * 首頁橫額兩張圖（Phase 4）：catalog 有 banner 就用（remote → prebuild snapshot，見 catalog/runtime.ts），
 * 冇就用內建圖。尺寸由 catalog ASSET_DIMENSIONS 鎖死（S-805 SSoT，S-925），所以闊高比例唔使睇係邊個 source
 */
export const bannerImages = ({ builtIn = false }: BannerImagesOptions = {}): Readonly<
    Record<BannerImage, BannerSource>
> => {
    const src = (builtIn ? undefined : activeBanner()) ?? BUILT_IN_SRC;
    return {
        standard: { src: src.standard, ...ASSET_DIMENSIONS.bannerStandard },
        long: { src: src.long, ...ASSET_DIMENSIONS.bannerLong },
    };
};

/** 而家用緊 catalog banner（唔係內建圖） */
export const hasCatalogBanner = (): boolean => activeBanner() !== undefined;
