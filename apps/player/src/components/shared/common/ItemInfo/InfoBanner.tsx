import { CATALOG_IMAGE_CROSS_ORIGIN } from '../../../../config/catalogImage';
import type { InfoBanner as InfoBannerData } from '../../../../selectors/itemInfo';
import styles from './InfoBanner.module.css';

/**
 * 資料 sheet 頂部 banner（P9.5 #12 v3，_mockups_/catalog-item-info d-n-show / d-l-arc-s1）：
 * 主頁橫圖 16:9 貼 sheet 頂、左右貼邊；名 + 細字疊喺左下角，底部漸變陰影襯字。
 * 獨立資料 sheet 同全集 sheet（G1）共用；左右貼邊靠父層 --info-sheet-pad-x
 */
export const InfoBanner = ({ banner }: { banner: InfoBannerData }) => (
    <div className={styles.banner} data-testid="info-banner">
        <img
            className={styles.art}
            src={banner.art}
            alt=""
            // 拖 banner = 向下拉閂 sheet，唔好變成拖張圖
            draggable={false}
            crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}
        />
        <div className={styles.caption}>
            <h2 className={styles.title}>{banner.title}</h2>
            {banner.subtitle && <p className={styles.subtitle}>{banner.subtitle}</p>}
        </div>
    </div>
);
