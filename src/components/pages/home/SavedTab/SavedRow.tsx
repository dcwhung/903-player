import type { PointerEvent } from 'react';
import { t } from '../../../../i18n/t';
import { toPercent } from '../../../../utils/ratio';
import { PauseIcon, PlayIcon, TrashIcon } from '../../../shared/common/icons/icons';
import styles from './SavedTab.module.css';
import type { SavedRowView } from './savedTypes';
import { useRowSwipe } from './useRowSwipe';

const ICON_SIZE = 22;

/** ▷ 唔好開始左滑（撳掣 = 原地播） */
const keepPointer = (event: PointerEvent<HTMLButtonElement>) => event.stopPropagation();

/** 日期 / 集數 + 進度字，下面 2px 進度線 */
const RowText = ({ row }: { row: SavedRowView }) => (
    <>
        <span className={styles.line}>
            <span className={styles.label}>{row.label}</span>
            <span className={styles.state}>{row.status}</span>
        </span>
        <span className={styles.bar} aria-hidden="true">
            <span className={styles.fill} style={{ width: `${toPercent(row.ratio)}%` }} />
        </span>
    </>
);

/**
 * 收藏 tab 一行（_mockups_/bookmark）：日期 / 集數 + 進度字 + 2px 進度線，右邊 ▷ / ⏸（同內頁集數清單一樣冇框白色）。
 * 撳 ▷ = 原地播 / 暫停；撳行其他位置 = 入嗰集（唔播）；左滑過四成移除（useRowSwipe）
 */
export const SavedRow = ({ row }: { row: SavedRowView }) => {
    const { bindRow, bindCard, handlers, onKeyDown } = useRowSwipe(row.onRemove);
    const { name, label, status } = row;
    return (
        <li
            ref={bindRow}
            className={styles.row}
            data-saved-row=""
            data-playing={String(row.playing)}
            data-zoom-key={row.zoomKey}
        >
            <div ref={bindCard} className={styles.card} {...handlers}>
                <span className={styles.trash} aria-hidden="true">
                    <TrashIcon size={ICON_SIZE} />
                </span>
                <button
                    type="button"
                    className={styles.open}
                    aria-label={t('bookmark.open', { name, label, status })}
                    aria-keyshortcuts="Delete"
                    title={t('bookmark.removeHint')}
                    onKeyDown={onKeyDown}
                    onClick={row.onOpen}
                >
                    <RowText row={row} />
                </button>
                <button
                    type="button"
                    className={styles.play}
                    aria-label={t(row.playing ? 'bookmark.pause' : 'bookmark.play', {
                        name,
                        label,
                    })}
                    onPointerDown={keepPointer}
                    onClick={row.onPlay}
                >
                    {row.playing ? (
                        <PauseIcon size={ICON_SIZE} />
                    ) : (
                        <PlayIcon size={ICON_SIZE} filled={false} />
                    )}
                </button>
            </div>
        </li>
    );
};
