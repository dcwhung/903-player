import { t } from '../../i18n/t';
import styles from './DateStrip.module.css';
import { SideCell } from './SideCell';
import { useDateStrip, type DateStripStepOptions } from './useDateStrip';

interface DateStripProps extends DateStripStepOptions {
    /** 節目名：畫面顯示喺頁頭，呢度只係畀轉集區個名用 */
    title: string;
}

/**
 * 節目頁唱片下面嘅日子條：左新一集、中「現正播放：日期」、右舊一集。
 * 成條跟手指拖：向左 = 舊一集，向右 = 新一集；撳側格或者方向鍵都得。
 */
export const DateStrip = ({ title, ...options }: DateStripProps) => {
    const { ids, zone, trackRef, go, announcement } = useDateStrip(options);
    const { dateLabel, neighbours } = options;
    return (
        <div className={styles.strip} {...zone}>
            <div ref={trackRef} className={styles.track}>
                <SideCell direction="previous" date={neighbours.newer} onPick={go} />
                <span className={`${styles.cell} ${styles.current}`}>
                    <span className={styles.label}>{t('player.nowPlaying')}</span>
                    <span id={ids.date}>{dateLabel}</span>
                </span>
                <SideCell direction="next" date={neighbours.older} onPick={go} />
            </div>
            {/* hidden：唔會再讀多次（頁頭已經有），但 aria-labelledby 照用到 */}
            <span id={ids.title} hidden>
                {title}
            </span>
            <span id={ids.hint} className={styles.visuallyHidden}>
                {t('episodes.switchHint')}
            </span>
            <span role="status" aria-live="polite" className={styles.visuallyHidden}>
                {announcement}
            </span>
        </div>
    );
};
