import { CATALOG_IMAGE_CROSS_ORIGIN } from '../../../../config/catalogImage';
import { t } from '../../../../i18n/t';
import { bannerImages } from './bannerImages';
import styles from './CoverBanner.module.css';

/** 闊橫版填滿格嘅橫額：標準版圖（catalog banner 或內建 banner.webp）填滿個格（cover，fillShape 已經揀咗裁得最少嘅格） */
export const CoverBanner = () => (
    <span className={styles.cover}>
        <img
            className={styles.image}
            src={bannerImages().standard.src}
            alt={t('home.bannerAlt')}
            crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}
        />
    </span>
);
