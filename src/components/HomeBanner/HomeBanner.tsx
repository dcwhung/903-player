import bannerImage from '../../assets/banner.webp';
import { t } from '../../i18n/t';
import styles from './HomeBanner.module.css';

/**
 * 主頁頁頂橫額（用戶提供嘅 903 叱咤 Player 圖，原圖喺 design/banner.webp）。
 * 橫額本身就係頁標題：<h1> 包住 <img>，heading 嘅名由 alt 嚟，唔使另外收埋一句字。
 */
export const HomeBanner = () => (
    <h1 className={styles.banner}>
        <img className={styles.image} src={bannerImage} alt={t('home.bannerAlt')} />
    </h1>
);
