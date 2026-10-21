import { useId } from 'react';
import { ARC_START_DEGREES } from '../../config/constants';
import { t } from '../../i18n/t';
import { arcDashArray } from '../../utils/arc';
import { CENTER, RADIUS, STROKE_WIDTH, VIEWBOX_SIZE } from '../ArcSlider/ArcSlider.constants';
import { Disc } from '../Disc/Disc';
import styles from './TodayEmpty.module.css';

/**
 * 今日節目全部未上架：卡疊嘅位改為灰色 player ring + 冇節目圖嘅唱片（唔可以撳），
 * 上架之後 probe 搵到就自動換返卡疊（見 design/previews/unavailable-preview.html）。
 * 唔用 role="status"：入頁就喺度，唔係動態通知；用標題做 region 名
 */
export const TodayEmpty = () => {
    const titleId = useId();
    return (
        <section className={styles.empty} aria-labelledby={titleId}>
            <div className={styles.gauge} aria-hidden="true">
                <svg className={styles.ring} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
                    <circle
                        className={styles.track}
                        cx={CENTER}
                        cy={CENTER}
                        r={RADIUS}
                        strokeWidth={STROKE_WIDTH}
                        strokeDasharray={arcDashArray(1, RADIUS)}
                        transform={`rotate(${ARC_START_DEGREES} ${CENTER} ${CENTER})`}
                    />
                </svg>
                <div className={styles.disc}>
                    <Disc />
                </div>
            </div>
            <h2 id={titleId} className={styles.title}>
                {t('today.emptyTitle')}
            </h2>
            <p className={styles.hint}>{t('today.emptyHint')}</p>
        </section>
    );
};
