import { CalendarIcon, SoundWaveIcon } from '../icons/icons';
import styles from './ShowTile.module.css';

interface ShowTileProps {
    label: string;
    /** 節目圖（show variant） */
    art?: string;
    variant?: 'show' | 'today';
    onClick: () => void;
}

const TODAY_ICON_SIZE = 22;
const WAVE_ICON_SIZE = 24;

/** 主頁掣：節目用節目圖（冇文字，靠 aria-label），今日節目用文字 */
export const ShowTile = ({ label, art, variant = 'show', onClick }: ShowTileProps) =>
    variant === 'today' ? (
        <button type="button" className={`${styles.tile} ${styles.today}`} onClick={onClick}>
            <CalendarIcon size={TODAY_ICON_SIZE} className={styles.todayIcon} />
            <span>{label}</span>
            {/* 純裝飾聲波（StrokeIcon 已經 aria-hidden），screen reader 唔會讀 */}
            <SoundWaveIcon size={WAVE_ICON_SIZE} className={styles.wave} />
        </button>
    ) : (
        <button type="button" className={styles.tile} aria-label={label} onClick={onClick}>
            {art && <img className={styles.art} src={art} alt="" />}
        </button>
    );
