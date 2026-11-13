import { CATALOG_IMAGE_CROSS_ORIGIN } from '../../../../config/catalogImage';
import { t } from '../../../../i18n/t';
import { useBannerImages } from './useBannerImages';
import styles from './CoverBanner.module.css';

/**
 * 闊橫版填滿格嘅橫額：標準版圖（catalog banner 或內建 banner.webp）填滿個格（cover，fillShape 已經揀咗裁得最少嘅格）；
 * catalog 圖載入失敗換返內建圖（S-929）
 */
export const CoverBanner = () => {
    const { images, onError } = useBannerImages();
    return (
        <span className={styles.cover}>
            <img
                className={styles.image}
                src={images.standard.src}
                alt={t('home.bannerAlt')}
                crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}
                onError={onError}
            />
        </span>
    );
};
