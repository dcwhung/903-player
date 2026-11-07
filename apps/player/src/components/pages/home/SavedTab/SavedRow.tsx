import { t } from '../../../../i18n/t';
import { TrashIcon } from '../../../shared/common/icons/icons';
import { OnAirLamp } from '../../../shared/common/OnAirBadge/OnAirLamp';
import { showToast } from '../../../shared/common/Toast/toastStore';
import { SavedOpenButton } from './SavedOpenButton';
import { SavedPlayButton } from './SavedPlayButton';
import styles from './SavedTab.module.css';
import { lampState, SAVED_ROW_ICON_SIZE } from './savedRowState';
import type { SavedRowView } from './savedTypes';
import { useRowSwipe } from './useRowSwipe';

/** 左滑 / Delete 決定移除嗰刻：同撳 ★ 一樣出「已移除收藏」（B1，冇復原） */
const announceRemoved = () => showToast(t('bookmark.removed'));

/**
 * 收藏 tab 一行（_mockups_/bookmark）：日期 / 集數 + 進度字 + 2px 進度線，右邊 ▷ / ⏸（同內頁集數清單一樣冇框白色）。
 * 撳 ▷ = 原地播 / 暫停；撳行其他位置 = 入嗰集（唔播）；左滑過四成移除（useRowSwipe）
 *
 * 已下架（P8 #6）：灰色「已下架」、冇 ▷、撳唔到，照可以左滑 / Delete 移除（見 SavedOpenButton）
 */
export const SavedRow = ({ row }: { row: SavedRowView }) => {
    const { bindRow, bindCard, handlers, onKeyDown } = useRowSwipe(row.onRemove, announceRemoved);
    const lamp = lampState(row);
    return (
        <li
            ref={bindRow}
            className={styles.row}
            data-saved-row=""
            data-playing={String(row.playing)}
            data-current={String(lamp !== null)}
            data-removed={row.removed ? '' : undefined}
            data-zoom-key={row.zoomKey}
        >
            <div ref={bindCard} className={styles.card} {...handlers}>
                {lamp && <OnAirLamp state={lamp} />}
                <span className={styles.trash} aria-hidden="true">
                    <TrashIcon size={SAVED_ROW_ICON_SIZE} />
                </span>
                <SavedOpenButton row={row} onKeyDown={onKeyDown} />
                {!row.removed && <SavedPlayButton row={row} />}
            </div>
        </li>
    );
};
