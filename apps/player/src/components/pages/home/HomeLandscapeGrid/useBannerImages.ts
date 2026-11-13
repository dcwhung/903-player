import { useState } from 'react';
import { bannerImages, hasCatalogBanner } from './bannerImages';

/**
 * 橫額圖 + <img onError>（S-929）：catalog banner 圖 404 / 冇 CORS header 載入失敗，就換返 src/assets 內建圖。
 * 已經用緊內建圖就唔再處理 onError（冇得再退，免得 loop）。換圖係即時切換，冇動畫
 */
export const useBannerImages = () => {
    const [failed, setFailed] = useState(false);
    const builtIn = failed || !hasCatalogBanner();
    return {
        images: bannerImages({ builtIn }),
        onError: builtIn ? undefined : () => setFailed(true),
    };
};
