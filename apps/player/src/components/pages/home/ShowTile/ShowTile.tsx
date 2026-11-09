import todayArt from '../../../../assets/today-tile.webp';
import { t } from '../../../../i18n/t';
import { NewBadge } from '../../../shared/common/NewBadge/NewBadge';
import styles from './ShowTile.module.css';
import { CATALOG_IMAGE_CROSS_ORIGIN } from '../../../../config/catalogImage';

interface ShowTileProps {
    label: string;
    /** 節目圖（show variant） */
    art?: string;
    variant?: 'show' | 'today';
    /** 今日有新一集（已上架、未聽完）：左上角加「New」 */
    isNew?: boolean;
    /** 撳落 zoom 入頁時認返呢格（utils/cardZoom 嘅 zoomKey） */
    zoomKey?: string;
    onClick: () => void;
}

/**
 * 主頁掣：節目用節目圖（冇文字，靠 aria-label）；
 * 今日節目用插畫底圖（原圖喺 design/today-tile.webp），「今日節目」字放喺中間米色帶
 */
export const ShowTile = ({
    label,
    art,
    variant = 'show',
    isNew = false,
    zoomKey,
    onClick,
}: ShowTileProps) =>
    variant === 'today' ? (
        <button
            type="button"
            className={`${styles.tile} ${styles.today}`}
            data-zoom-key={zoomKey}
            onClick={onClick}
        >
            <img
                className={styles.art}
                src={todayArt}
                alt=""
                crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}
            />
            <span className={styles.todayLabel}>{label}</span>
        </button>
    ) : (
        <button
            type="button"
            className={styles.tile}
            aria-label={isNew ? t('home.showNew', { name: label }) : label}
            data-zoom-key={zoomKey}
            onClick={onClick}
        >
            {art && (
                <img
                    className={styles.art}
                    src={art}
                    alt=""
                    crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}
                />
            )}
            {isNew && <NewBadge className={styles.newBadge} />}
        </button>
    );
