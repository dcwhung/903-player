import { CalendarIcon } from '../icons/icons';
import styles from './ShowTile.module.css';

interface ShowTileProps {
    label: string;
    /** 節目圖（show variant） */
    art?: string;
    variant?: 'show' | 'today';
    onClick: () => void;
}

const TODAY_ICON_SIZE = 22;

/** 主頁掣：節目用節目圖（冇文字，靠 aria-label），今日節目用文字 */
export const ShowTile = ({ label, art, variant = 'show', onClick }: ShowTileProps) =>
    variant === 'today' ? (
        <button type="button" className={`${styles.tile} ${styles.today}`} onClick={onClick}>
            <CalendarIcon size={TODAY_ICON_SIZE} />
            <span>{label}</span>
        </button>
    ) : (
        <button type="button" className={styles.tile} aria-label={label} onClick={onClick}>
            {art && <img className={styles.art} src={art} alt="" />}
        </button>
    );
