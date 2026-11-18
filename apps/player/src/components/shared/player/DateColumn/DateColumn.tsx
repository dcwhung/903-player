import { useId, useLayoutEffect, useRef } from 'react';
import { t } from '../../../../i18n/t';
import { formatSpokenDate } from '../../../../utils/date';
import type { StripDay } from '../DateStrip/dateStrip';
import { DayText } from '../DateStrip/DayCell';
import strip from '../DateStrip/DateStrip.module.css';
import { useStepAnnouncement } from '../DateStrip/useStepAnnouncement';
import styles from './DateColumn.module.css';

interface DateColumnProps {
    /** 日子條嘅日子（由新到舊）；直排淨係列有集數嘅（冇節目同盡頭留空格唔出） */
    days: readonly StripDay[];
    /** 現正播放嗰日嘅 index（同 DateStrip） */
    current: number;
    onPick: (url: string) => void;
    /** 未讀到時長：標籤由「現正播放」改做「連線中…」（同 DateStrip） */
    connecting: boolean;
    /** 現正播放嗰日嘅讀屏版（「17/10 星期六」）：轉集後讀「已轉到…」（同 DateStrip） */
    dateLabel: string;
}

/**
 * 直排日子（P10 lane 5b，Duo 打開・直，_mockups_/iphone-duo 方案 B）：喺唱片右邊由新到舊一格一集，
 * 現正播放 highlight；放唔晒自己上下捲，入頁 / 轉集時捲到現正播放嗰格。
 * 唔使拖動手勢：一列掣，撳日子即播（同日子條撳日子一樣行 onPick）。
 * 讀屏 / 鍵盤（W-792）：成欄以標籤命名；每格都係掣（現正播放嗰格 aria-current + aria-disabled），
 * 撳完焦點留喺同一粒掣；轉集後經 polite live region 讀「已轉到…」，同日子條一樣
 */
export const DateColumn = ({ days, current, onPick, connecting, dateLabel }: DateColumnProps) => {
    const currentRef = useRef<HTMLButtonElement>(null);
    const labelId = useId();
    const { announcement, markStep } = useStepAnnouncement(dateLabel);
    const currentDate = days[current]?.date;
    useLayoutEffect(() => {
        currentRef.current?.scrollIntoView?.({ block: 'nearest' });
    }, [currentDate]);
    const pick = (url: string, isCurrent: boolean) => {
        markStep(!isCurrent);
        if (!isCurrent) onPick(url);
    };
    return (
        <div className={styles.column}>
            <span id={labelId} className={strip.label}>
                {t(connecting ? 'episodes.connecting' : 'episodes.nowPlayingLabel')}
            </span>
            <ul className={styles.list} aria-labelledby={labelId}>
                {days.map((day, index) => {
                    const { url } = day;
                    if (!day.inRange || url === null) return null;
                    const isCurrent = index === current;
                    return (
                        <li key={day.date}>
                            <button
                                ref={isCurrent ? currentRef : undefined}
                                type="button"
                                className={`${strip.cell} ${isCurrent ? strip.current : strip.day} ${styles.cell}${isCurrent ? ` ${styles.currentDay}` : ''}`}
                                aria-current={isCurrent ? 'date' : undefined}
                                aria-disabled={isCurrent || undefined}
                                aria-label={t('episodes.pickDay', {
                                    date: formatSpokenDate(day.date),
                                })}
                                onClick={() => pick(url, isCurrent)}
                            >
                                <DayText date={day.date} />
                            </button>
                        </li>
                    );
                })}
            </ul>
            <span role="status" aria-live="polite" className={strip.visuallyHidden}>
                {announcement}
            </span>
        </div>
    );
};
