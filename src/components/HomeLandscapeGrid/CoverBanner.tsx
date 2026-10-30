import { t } from '../../i18n/t';
import { BANNER_IMAGES } from './bannerImages';
import styles from './CoverBanner.module.css';

/** 闊橫版填滿格嘅橫額：標準版 banner.webp 填滿個格（cover，fillShape 已經揀咗裁得最少嘅格） */
export const CoverBanner = () => (
    <span className={styles.cover}>
        <img className={styles.image} src={BANNER_IMAGES.standard.src} alt={t('home.bannerAlt')} />
    </span>
);
