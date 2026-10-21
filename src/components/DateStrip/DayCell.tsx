import { t } from '../../i18n/t';
import { WEEKDAYS } from '../../i18n/zh-HK';
import { formatDateLabel, formatDayMonth, weekdayOf } from '../../utils/date';
import type { StripDay } from './dateStrip';
import styles from './DateStrip.module.css';

interface DayCellProps {
    day: StripDay;
    isCurrent: boolean;
    onPick: () => void;
}

/** 上面星期（一、二…），下面日/月 */
const DayText = ({ date }: { date: string }) => (
    <>
        <span className={styles.weekday}>{WEEKDAYS[weekdayOf(date)]}</span>
        <span className={styles.dayMonth}>{formatDayMonth(date)}</span>
    </>
);

/**
 * 日子條一格：超出最新 / 最舊一集留空；冇節目灰色（唔撳得、唔讀）；
 * 現正播放喺正中 highlight box；其他有集數嘅日子撳落去就播（唔入 tab 次序，用方向鍵）
 */
export const DayCell = ({ day, isCurrent, onPick }: DayCellProps) => {
    if (!day.inRange) return <span className={styles.cell} aria-hidden="true" />;
    if (day.url === null) {
        return (
            <span className={`${styles.cell} ${styles.empty}`} aria-hidden="true">
                <DayText date={day.date} />
            </span>
        );
    }
    if (isCurrent) {
        return (
            <span className={`${styles.cell} ${styles.current}`} aria-current="date">
                <DayText date={day.date} />
            </span>
        );
    }
    return (
        <button
            type="button"
            tabIndex={-1}
            className={`${styles.cell} ${styles.day}`}
            aria-label={t('episodes.pickDay', { date: formatDateLabel(day.date) })}
            onClick={onPick}
        >
            <DayText date={day.date} />
        </button>
    );
};
