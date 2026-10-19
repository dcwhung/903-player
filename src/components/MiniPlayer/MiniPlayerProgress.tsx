import { t } from '../../i18n/t';
import styles from './MiniPlayer.module.css';

interface MiniPlayerProgressProps {
    /** 0–1 */
    progress: number;
    /** 例如「12:40 / 1:58:30」；未知長度時冇 */
    timeText?: string;
}

const PERCENT = 100;

/** 底部細進度條；有名同 value text，所以條 track 本身只係裝飾 */
export const MiniPlayerProgress = ({ progress, timeText }: MiniPlayerProgressProps) => {
    const percent = Math.round(progress * PERCENT);
    return (
        <div
            className={styles.progress}
            role="progressbar"
            aria-label={t('player.progress')}
            aria-valuetext={timeText}
            aria-valuemin={0}
            aria-valuemax={PERCENT}
            aria-valuenow={percent}
        >
            <div className={styles.fill} style={{ width: `${percent}%` }} />
        </div>
    );
};
