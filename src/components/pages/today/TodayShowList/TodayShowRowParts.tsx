import { t } from '../../../../i18n/t';
import { CheckIcon } from '../../../shared/common/icons/icons';
import { OnAirBadge } from '../../../shared/common/OnAirBadge/OnAirBadge';
import { OnAirLamp } from '../../../shared/common/OnAirBadge/OnAirLamp';
import type { TodayShowItem } from './TodayShowList';
import styles from './TodayShowList.module.css';

const STATUS_ICON_SIZE = 12;

/** 時間 + 狀態：播緊 =「06:00」+「播放中」紅 pill；其他 =「06:00 · 已收聽」等 */
export const RowStatus = ({ item, statusText }: { item: TodayShowItem; statusText: string }) => (
    <span className={`${styles.status} ${styles[item.status] ?? ''}`}>
        {item.status === 'watched' && <CheckIcon size={STATUS_ICON_SIZE} />}
        {item.status === 'playing' ? (
            <>
                {item.time}
                <OnAirBadge />
            </>
        ) : (
            t('today.timeWithStatus', { time: item.time, status: statusText })
        )}
    </span>
);

/** 左邊條：播緊紅（live）；揀中但暫停灰（idle） */
export const RowLamp = ({ item }: { item: TodayShowItem }) => {
    if (item.status === 'playing') return <OnAirLamp state="live" />;
    return item.active ? <OnAirLamp state="idle" /> : null;
};
