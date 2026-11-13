import { useState } from 'react';
import { bannerImages, hasCatalogBanner } from './bannerImages';

/**
 * 今個 session catalog banner 圖試過載入失敗（S-955）：記喺 module 層，
 * 轉向換咗 component（HomeBanner / FittedBanner / CoverBanner）都唔會再請求已知失敗嘅 URL、閃一下爛圖
 */
let catalogBannerFailed = false;

/** test 用：清走失敗記錄 */
export const resetBannerFallback = (): void => {
    catalogBannerFailed = false;
};

/**
 * 橫額圖 + <img onError>（S-929）：catalog banner 圖 404 / CORS 唔批載入失敗，就換返 src/assets 內建圖。
 * 已經用緊內建圖就唔再處理 onError（冇得再退，免得 loop）。換圖係即時切換，冇動畫
 */
export const useBannerImages = () => {
    const [failed, setFailed] = useState(() => catalogBannerFailed);
    const builtIn = failed || !hasCatalogBanner();
    const onError = () => {
        catalogBannerFailed = true;
        setFailed(true);
    };
    return {
        images: bannerImages({ builtIn }),
        onError: builtIn ? undefined : onError,
    };
};
