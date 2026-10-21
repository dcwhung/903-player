import { t } from '../../i18n/t';
import { DayCell } from './DayCell';
import styles from './DateStrip.module.css';
import { useDateStrip, type DateStripStepOptions } from './useDateStrip';

interface DateStripProps extends DateStripStepOptions {
    /** 節目名：畫面顯示喺頁頭，呢度只係畀轉集區個名用 */
    title: string;
    /** 未讀到時長（例如斷網）：標籤由「現正播放」改做「連線中…」 */
    connecting?: boolean;
}

/**
 * 節目頁唱片下面嘅日子條：上面「現正播放」標籤；條入面一次見到 7 日（新一集喺左），
 * 現正播放永遠喺正中 highlight box。成條跟手指拖，放手滑去最近有集數嗰日；撳日子或者方向鍵都得。
 */
export const DateStrip = ({ title, connecting = false, ...options }: DateStripProps) => {
    const { ids, zone, trackRef, onTrackClick, announcement } = useDateStrip(options);
    const { dateLabel, days, current } = options;
    return (
        <div className={styles.group}>
            <span className={styles.label}>
                {t(connecting ? 'episodes.connecting' : 'episodes.nowPlayingLabel')}
            </span>
            <div className={styles.strip} {...zone}>
                {/* click 代理：撳到嘅日子掣冒泡上嚟（鍵盤 / 輔助技術 activate 掣都係 click） */}
                <div ref={trackRef} className={styles.track} onClick={onTrackClick}>
                    {days.map((day, index) => (
                        <DayCell
                            key={day.date}
                            day={day}
                            index={index}
                            isCurrent={index === current}
                        />
                    ))}
                </div>
                {/* hidden：畫面上日期分開兩行，轉集區個名用完整日期；節目名頁頭已經有 */}
                <span id={ids.date} hidden>
                    {dateLabel}
                </span>
                <span id={ids.title} hidden>
                    {title}
                </span>
                <span id={ids.hint} className={styles.visuallyHidden}>
                    {t('episodes.switchHint')}
                </span>
            </div>
            {/* 喺 .strip 外面：橫版收埋日子條（DateStrip.module.css）都照樣讀出轉集 */}
            <span role="status" aria-live="polite" className={styles.visuallyHidden}>
                {announcement}
            </span>
        </div>
    );
};
