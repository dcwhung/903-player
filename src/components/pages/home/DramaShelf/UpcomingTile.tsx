/* 主頁書架最尾嘅新劇灰格（P8 #6，_mockups_/coming-soon ⑦ Z1） */
import { ClockIcon } from '../../../shared/common/icons/icons';
import styles from './DramaShelf.module.css';
import type { DramaTileProps, TileNotice } from './dramaTileTypes';

const UPCOMING_ICON_SIZE = 14;

/**
 * 整套劇即將上架：灰階圖 + 底部深色條（「即將上架 · 01/12」），冇短篇數、冇繼續收聽。
 * aria-disabled（唔用 disabled，Tab / 讀屏照行到），撳落完全冇反應：唔入頁，直版疊卡亦唔接
 * 撳卡 focus 嘅 handler（唔會撳嚟 focus / 捲動）；捲到佢 snap 位先會變 focus 卡
 */
export const UpcomingTile = ({
    item,
    focus,
}: DramaTileProps & { item: { upcoming: TileNotice } }) => (
    <div
        className={`${styles.tile} ${styles.upcoming}`}
        data-focused={focus?.focused ? '' : undefined}
    >
        <button
            type="button"
            className={styles.open}
            aria-disabled="true"
            aria-label={item.upcoming.label}
        >
            <img className={styles.art} src={item.art} alt="" draggable={false} />
            <span className={styles.upcomingBar} aria-hidden="true">
                <ClockIcon size={UPCOMING_ICON_SIZE} />
                {item.upcoming.text}
            </span>
        </button>
    </div>
);
