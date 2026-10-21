import todayArt from '../../assets/today-tile.webp';
import styles from './ShowTile.module.css';

interface ShowTileProps {
    label: string;
    /** 節目圖（show variant） */
    art?: string;
    variant?: 'show' | 'today';
    onClick: () => void;
}

/**
 * 主頁掣：節目用節目圖（冇文字，靠 aria-label）；
 * 今日節目用插畫底圖（原圖喺 design/today-tile.webp），「今日節目」字放喺中間米色帶
 */
export const ShowTile = ({ label, art, variant = 'show', onClick }: ShowTileProps) =>
    variant === 'today' ? (
        <button type="button" className={`${styles.tile} ${styles.today}`} onClick={onClick}>
            <img className={styles.art} src={todayArt} alt="" />
            <span className={styles.todayLabel}>{label}</span>
        </button>
    ) : (
        <button type="button" className={styles.tile} aria-label={label} onClick={onClick}>
            {art && <img className={styles.art} src={art} alt="" />}
        </button>
    );
