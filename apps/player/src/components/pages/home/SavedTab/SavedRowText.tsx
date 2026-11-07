import { t } from '../../../../i18n/t';
import { toPercent } from '../../../../utils/ratio';
import { HourglassIcon } from '../../../shared/common/icons/icons';
import { OnAirBadge } from '../../../shared/common/OnAirBadge/OnAirBadge';
import { Separator } from '../../../shared/common/Separator/Separator';
import styles from './SavedTab.module.css';
import type { SavedRowView } from './savedTypes';

const NOTICE_ICON_SIZE = 12;

/** 右邊狀態：已下架「已下架」；播緊「播放中」紅 pill（讀屏由行掣 aria-label 講）；其他（連線中…）照寫 */
const stateContent = (row: SavedRowView) => {
    if (row.removed) return t('availability.removed');
    return row.onAir ? <OnAirBadge /> : row.status;
};

/** 快將下架（LB1）：狀態字後面「· ⏳ 琥珀字」；已下架唔使再講 */
const LeavingNote = ({ row }: { row: SavedRowView }) =>
    row.leaving && !row.removed ? (
        <span className={styles.leaving}>
            <Separator className={styles.leavingSeparator} />
            <HourglassIcon size={NOTICE_ICON_SIZE} />
            {row.leaving.text}
        </span>
    ) : null;

/** 日期 / 集數 + 進度字（快將下架加琥珀字 LB1；已下架寫「已下架」），下面 2px 進度線 */
export const SavedRowText = ({ row }: { row: SavedRowView }) => (
    <>
        <span className={styles.line}>
            <span className={styles.label}>{row.label}</span>
            <span className={styles.state}>
                {stateContent(row)}
                <LeavingNote row={row} />
            </span>
        </span>
        <span className={styles.bar} aria-hidden="true">
            <span className={styles.fill} style={{ width: `${toPercent(row.ratio)}%` }} />
        </span>
    </>
);
