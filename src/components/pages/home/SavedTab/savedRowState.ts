import { t } from '../../../../i18n/t';
import type { OnAirLampState } from '../../../shared/common/OnAirBadge/OnAirLamp';
import type { SavedRowView } from './savedTypes';

/** 收藏行 ▷ / ⏸ 同左滑垃圾桶 icon 大細（同內頁集數清單一樣） */
export const SAVED_ROW_ICON_SIZE = 22;

/** 左邊條：播緊紅（live）；載入咗但暫停 / 連線中灰（idle）；已下架 / 其他行冇 */
export const lampState = (row: SavedRowView): OnAirLampState | null => {
    if (row.removed || !row.current) return null;
    return row.onAir ? 'live' : 'idle';
};

/**
 * 開行掣讀屏名（讀屏版日子，畫面照顯示 row.label）：已下架講「已下架」（D3）；快將下架加日子
 */
export const openLabel = ({
    name,
    spokenLabel: label,
    status,
    removed,
    leaving,
}: SavedRowView): string => {
    if (removed) return t('availability.removedRow', { name, label });
    const shown = leaving
        ? t('availability.withLeaving', { label: status, when: leaving.label })
        : status;
    return t('bookmark.open', { name, label, status: shown });
};
