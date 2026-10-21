import type { ReactNode } from 'react';
import bannerImage from '../../assets/banner.webp';
import { t } from '../../i18n/t';
import styles from './HomeBanner.module.css';

interface HomeBannerProps {
    /** 疊喺橫額右下角嘅嘢（例如版本號）；放喺 <h1> 外面，唔會變成標題嘅一部分 */
    corner?: ReactNode;
}

/**
 * 主頁頁頂橫額（用戶提供嘅 903 叱咤 Player 圖，原圖喺 design/banner.webp）。
 * 橫額本身就係頁標題：<h1> 包住 <img>，heading 嘅名由 alt 嚟，唔使另外收埋一句字。
 */
export const HomeBanner = ({ corner }: HomeBannerProps) => (
    <div className={styles.banner}>
        <h1 className={styles.heading}>
            <img className={styles.image} src={bannerImage} alt={t('home.bannerAlt')} />
        </h1>
        {corner && <div className={styles.corner}>{corner}</div>}
    </div>
);
