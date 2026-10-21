import { memo } from 'react';
import { t } from '../../i18n/t';
import { WEEKDAYS } from '../../i18n/zh-HK';
import { formatDateLabel, formatDayMonth, weekdayOf } from '../../utils/date';
import { DAY_INDEX_ATTR, type StripDay } from './dateStrip';
import styles from './DateStrip.module.css';

interface DayCellProps {
    day: StripDay;
    /** 第幾格：撳落去由 DateStrip 嘅 track 代理 click 讀返 */
    index: number;
    isCurrent: boolean;
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
 * 現正播放喺正中 highlight box；其他有集數嘅日子撳落去就播（唔入 tab 次序，用方向鍵）。
 * memo：播緊時每秒幾次 re-render，日子冇變就唔使重畫成段歷史
 */
export const DayCell = memo(({ day, index, isCurrent }: DayCellProps) => {
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
            {...{ [DAY_INDEX_ATTR]: index }}
        >
            <DayText date={day.date} />
        </button>
    );
});

DayCell.displayName = 'DayCell';
