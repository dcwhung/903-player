import { CATALOG_IMAGE_CROSS_ORIGIN } from '../../../../config/catalogImage';
import type { InfoBanner as InfoBannerData } from '../../../../selectors/itemInfo';
import styles from './InfoBanner.module.css';

interface InfoBannerProps {
    banner: InfoBannerData;
    /**
     * sheet（預設）：貼 sheet 頂、左右貼邊（靠父層 --info-sheet-pad-x），上面兩角跟 sheet 圓角；
     * list：節目頁 / 每日劇集數清單頂（EpisodeList top，v2.0.1 用戶反饋），同清單行左右對齊、四角圓角
     */
    placement?: 'sheet' | 'list';
}

/**
 * 資料 sheet 頂部 banner（P9.5 #12 v3，_mockups_/catalog-item-info d-n-show / d-l-arc-s1）：
 * 主頁橫圖貼頂；名 + 細字疊喺左下角，底部漸變陰影襯字。
 * 獨立資料 sheet、全集 sheet（G1）、HomeView 清單 sheet 同節目頁 / 每日劇清單頂共用（同一個比例同樣式）
 */
export const InfoBanner = ({ banner, placement = 'sheet' }: InfoBannerProps) => {
    // 清單頂：頁頭 h1 已經係同一個名，唔再做 heading（讀屏唔會有兩個同名標題）
    const Title = placement === 'list' ? 'p' : 'h2';
    return (
        <div className={styles.banner} data-testid="info-banner" data-placement={placement}>
            <img
                className={styles.art}
                src={banner.art}
                alt=""
                // 拖 banner = 向下拉閂 sheet，唔好變成拖張圖
                draggable={false}
                crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}
            />
            <div className={styles.caption}>
                <Title className={styles.title}>{banner.title}</Title>
                {banner.subtitle && <p className={styles.subtitle}>{banner.subtitle}</p>}
            </div>
        </div>
    );
};

/** 疊喺 banner 上嘅 grab bar / ✕ 共用樣（S-1021）：加喺元素 className，同時要有 data-on-banner */
export const BANNER_OVERLAY = {
    grab: styles.grabOnBanner,
    close: styles.closeOnBanner,
} as const;
