import { useLayoutEffect, useRef } from 'react';
import { t } from '../../../../i18n/t';
import { formatSpokenDate } from '../../../../utils/date';
import type { StripDay } from '../DateStrip/dateStrip';
import { DayText } from '../DateStrip/DayCell';
import strip from '../DateStrip/DateStrip.module.css';
import styles from './DateColumn.module.css';

interface DateColumnProps {
    /** 日子條嘅日子（由新到舊）；直排淨係列有集數嘅（冇節目同盡頭留空格唔出） */
    days: readonly StripDay[];
    /** 現正播放嗰日嘅 index（同 DateStrip） */
    current: number;
    onPick: (url: string) => void;
    /** 未讀到時長：標籤由「現正播放」改做「連線中…」（同 DateStrip） */
    connecting: boolean;
}

/**
 * 直排日子（P10 lane 5b，Duo 打開・直，_mockups_/iphone-duo 方案 B）：喺唱片右邊由新到舊一格一集，
 * 現正播放 highlight；放唔晒自己上下捲，入頁 / 轉集時捲到現正播放嗰格。
 * 唔使拖動手勢：一列掣，撳日子即播（同日子條撳日子一樣行 onPick）
 */
export const DateColumn = ({ days, current, onPick, connecting }: DateColumnProps) => {
    const currentRef = useRef<HTMLSpanElement>(null);
    const currentDate = days[current]?.date;
    useLayoutEffect(() => {
        currentRef.current?.scrollIntoView?.({ block: 'nearest' });
    }, [currentDate]);
    return (
        <div className={styles.column}>
            <span className={strip.label}>
                {t(connecting ? 'episodes.connecting' : 'episodes.nowPlayingLabel')}
            </span>
            <ul className={styles.list}>
                {days.map((day, index) => {
                    const { url } = day;
                    if (!day.inRange || url === null) return null;
                    return (
                        <li key={day.date}>
                            {index === current ? (
                                <span
                                    ref={currentRef}
                                    className={`${strip.cell} ${strip.current} ${styles.cell} ${styles.current}`}
                                    aria-current="date"
                                >
                                    <DayText date={day.date} />
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    className={`${strip.cell} ${strip.day} ${styles.cell}`}
                                    aria-label={t('episodes.pickDay', {
                                        date: formatSpokenDate(day.date),
                                    })}
                                    onClick={() => onPick(url)}
                                >
                                    <DayText date={day.date} />
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
