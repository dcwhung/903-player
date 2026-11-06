import { PERCENT } from '../../../../utils/ratio';
import { HourglassIcon } from '../../common/icons/icons';
import { OnAirBadge } from '../../common/OnAirBadge/OnAirBadge';
import { OnAirLamp } from '../../common/OnAirBadge/OnAirLamp';
import { Separator } from '../../common/Separator/Separator';
import styles from './EpisodeList.module.css';
import type { EpisodeItem } from './episodeListTypes';

const NOTICE_ICON_SIZE = 12;

/** 狀態字嘅 class：播緊（pill + 時間）/ 快將下架都係可以換行嘅 flex（窄欄時間落下一行） */
const statusClass = (item: EpisodeItem): string => {
    if (item.status.onAir) return `${styles.status} ${styles.onAir}`;
    return `${styles.status} ${item.leaving ? styles.withLeaving : ''}`;
};

/** 進度條 + 狀態字（播緊前面出「播放中」pill；快將下架就後面接琥珀字，LE1） */
export const RowBody = ({ percent, item }: { percent: number; item: EpisodeItem }) => (
    <span className={styles.body}>
        <span
            className={styles.bar}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={PERCENT}
            aria-valuenow={percent}
        >
            <span className={styles.fill} style={{ width: `${percent}%` }} />
        </span>
        <span className={statusClass(item)}>
            {item.status.onAir && <OnAirBadge />}
            {item.status.onAir ? <span>{item.status.text}</span> : item.status.text}
            {item.leaving && (
                <span className={styles.leaving}>
                    <Separator className={styles.leavingSeparator} />
                    <HourglassIcon size={NOTICE_ICON_SIZE} />
                    <span className={styles.leavingFull}>{item.leaving.text}</span>
                    <span className={styles.leavingTag}>{item.leaving.tag}</span>
                </span>
            )}
        </span>
    </span>
);

/** 左邊條：播緊紅（live）；揀中但暫停 / 未開始 / 連線中灰（idle）；其他行冇 */
export const RowLamp = ({ item }: { item: EpisodeItem }) => {
    if (item.status.onAir) return <OnAirLamp state="live" />;
    return item.current ? <OnAirLamp state="idle" /> : null;
};
