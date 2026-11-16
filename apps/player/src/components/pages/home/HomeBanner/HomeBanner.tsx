import type { ReactNode } from 'react';
import { CATALOG_IMAGE_CROSS_ORIGIN } from '../../../../config/catalogImage';
import { WIDE_BANNER_QUERY } from '../../../../config/layout';
import { t } from '../../../../i18n/t';
import { useBannerImages } from '../HomeLandscapeGrid/useBannerImages';
import styles from './HomeBanner.module.css';

interface HomeBannerProps {
    /** 疊喺橫額右下角嘅嘢（例如版本號）；放喺 <h1> 外面，唔會變成標題嘅一部分 */
    corner?: ReactNode;
    /** 代替預設 <picture> 嘅圖（手機打橫橫額格用 FittedBanner）；要自己帶 alt，h1 個名由佢嚟 */
    art?: ReactNode;
    /** 放喺格仔入面（闊橫版填滿格）：唔留左右白邊，拉滿個格，art 自己填滿 */
    fill?: boolean;
}

/**
 * 主頁頁頂橫額（用戶提供嘅 903 叱咤 Player 圖，原圖喺 design/banner.webp；catalog 有 banner 就用 catalog 嘅，見 bannerImages）。
 * 橫額本身就係頁標題：<h1> 包住 <img>，heading 嘅名由 alt 嚟，唔使另外收埋一句字。
 * 橫版成行（WIDE_BANNER_QUERY）換闊版圖（5:1，原圖喺 design/banner-wide.webp），內容集中喺中間，
 * 大部分畫面 cover 只裁走兩邊天空；好闊好矮嘅視窗（扁過 5:1）先會裁走少少上下。
 */
export const HomeBanner = ({ corner, art, fill = false }: HomeBannerProps) => (
    <div className={styles.banner} data-fill={fill ? '' : undefined}>
        <h1 className={styles.heading}>{art ?? <DefaultArt />}</h1>
        {corner && <div className={styles.corner}>{corner}</div>}
    </div>
);

/** 預設 <picture>：窄版 + 橫版成行換闊版；catalog 圖載入失敗兩張一齊換返內建圖（S-929） */
const DefaultArt = () => {
    const { images, onError } = useBannerImages();
    return (
        <picture>
            <source media={WIDE_BANNER_QUERY} srcSet={images.long.src} />
            <img
                className={styles.image}
                src={images.standard.src}
                alt={t('home.bannerAlt')}
                crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}
                onError={onError}
            />
        </picture>
    );
};
