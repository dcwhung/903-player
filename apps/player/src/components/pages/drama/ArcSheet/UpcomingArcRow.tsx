import { arcLabelOf } from '@903-player/catalog';
import { useId } from 'react';
import { t } from '../../../../i18n/t';
import { ClockIcon } from '../../../shared/common/icons/icons';
import { Marquee } from '../../../shared/common/Marquee/Marquee';
import { UPCOMING_GROUP_TITLE } from './arcLabels';
import styles from './ArcSheet.module.css';
import type { UpcomingArcRowView } from './arcSheetTypes';
import { CATALOG_IMAGE_CROSS_ORIGIN } from '../../../../config/catalogImage';

const CLOCK_ICON_SIZE = 18;

/**
 * 即將上架一行（_mockups_/coming-soon ① S1）：碟面灰、膠囊淡色寫上架日、右邊時鐘標記（裝飾，唔係掣）。
 * aria-disabled（Tab / 讀屏照行到），撳落乜都唔做、冇 hover / press 效果
 */
const UpcomingArcRow = ({ row }: { row: UpcomingArcRowView }) => (
    <li className={`${styles.row} ${styles.soon}`}>
        <button
            type="button"
            className={styles.pick}
            data-role="upcoming"
            aria-disabled="true"
            aria-label={row.label}
        >
            <span className={styles.ring} aria-hidden="true">
                <img
                    className={styles.cover}
                    src={row.cover}
                    alt=""
                    crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}
                    loading="lazy"
                    decoding="async"
                />
                <span className={styles.count}>{row.pill}</span>
            </span>
            <span className={styles.text} aria-hidden="true">
                <span className={styles.name}>
                    <Marquee className={styles.nameText} text={arcLabelOf(row)} />
                </span>
                <span className={styles.status}>{row.status}</span>
            </span>
        </button>
        <span className={styles.soonMark} aria-hidden="true">
            <ClockIcon size={CLOCK_ICON_SIZE} />
        </span>
    </li>
);

/** 「即將上架」組：排喺全集一覽表最底；冇就唔出 */
export const UpcomingArcGroup = ({ rows }: { rows: readonly UpcomingArcRowView[] }) => {
    const headingId = useId();
    if (rows.length === 0) return null;
    return (
        <section aria-labelledby={headingId}>
            <h3 id={headingId} className={styles.groupTitle}>
                {t(UPCOMING_GROUP_TITLE)}
            </h3>
            <ul className={styles.groupList}>
                {rows.map((row) => (
                    <UpcomingArcRow key={row.arc} row={row} />
                ))}
            </ul>
        </section>
    );
};
