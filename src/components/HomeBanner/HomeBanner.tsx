import type { ReactNode } from 'react';
import wideBannerImage from '../../assets/banner-wide.webp';
import bannerImage from '../../assets/banner.webp';
import { WIDE_BANNER_QUERY } from '../../config/layout';
import { t } from '../../i18n/t';
import styles from './HomeBanner.module.css';

interface HomeBannerProps {
    /** 疊喺橫額右下角嘅嘢（例如版本號）；放喺 <h1> 外面，唔會變成標題嘅一部分 */
    corner?: ReactNode;
    /** 代替預設 <picture> 嘅圖（手機打橫橫額格用 FittedBanner）；要自己帶 alt，h1 個名由佢嚟 */
    art?: ReactNode;
}

/**
 * 主頁頁頂橫額（用戶提供嘅 903 叱咤 Player 圖，原圖喺 design/banner.webp）。
 * 橫額本身就係頁標題：<h1> 包住 <img>，heading 嘅名由 alt 嚟，唔使另外收埋一句字。
 * 橫版成行（WIDE_BANNER_QUERY）換闊版圖（5:1，原圖喺 design/banner-wide.webp），內容集中喺中間，
 * 大部分畫面 cover 只裁走兩邊天空；好闊好矮嘅視窗（扁過 5:1）先會裁走少少上下。
 */
export const HomeBanner = ({ corner, art }: HomeBannerProps) => (
    <div className={styles.banner}>
        <h1 className={styles.heading}>
            {art ?? (
                <picture>
                    <source media={WIDE_BANNER_QUERY} srcSet={wideBannerImage} />
                    <img className={styles.image} src={bannerImage} alt={t('home.bannerAlt')} />
                </picture>
            )}
        </h1>
        {corner && <div className={styles.corner}>{corner}</div>}
    </div>
);
