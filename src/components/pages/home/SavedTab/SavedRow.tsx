import type { PointerEvent } from 'react';
import { t } from '../../../../i18n/t';
import { toPercent } from '../../../../utils/ratio';
import { HourglassIcon, PauseIcon, PlayIcon, TrashIcon } from '../../../shared/common/icons/icons';
import styles from './SavedTab.module.css';
import type { SavedRowView } from './savedTypes';
import { useRowSwipe } from './useRowSwipe';

const ICON_SIZE = 22;
const NOTICE_ICON_SIZE = 12;

/** ▷ 唔好開始左滑（撳掣 = 原地播） */
const keepPointer = (event: PointerEvent<HTMLButtonElement>) => event.stopPropagation();

/** 日期 / 集數 + 進度字（快將下架加琥珀字 LB1；已下架寫「已下架」），下面 2px 進度線 */
const RowText = ({ row }: { row: SavedRowView }) => (
    <>
        <span className={styles.line}>
            <span className={styles.label}>{row.label}</span>
            <span className={styles.state}>
                {row.removed ? t('availability.removed') : row.status}
                {row.leaving && !row.removed && (
                    <span className={styles.leaving}>
                        <HourglassIcon size={NOTICE_ICON_SIZE} />
                        {row.leaving.text}
                    </span>
                )}
            </span>
        </span>
        <span className={styles.bar} aria-hidden="true">
            <span className={styles.fill} style={{ width: `${toPercent(row.ratio)}%` }} />
        </span>
    </>
);

/** ▷ / ⏸：原地播 / 暫停（已下架冇） */
const PlayButton = ({ row }: { row: SavedRowView }) => {
    const { name, label } = row;
    return (
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
    );
};

/** 開行掣讀屏名：已下架講「已下架，未可以收聽」；快將下架加日子 */
const openLabel = ({ name, label, status, removed, leaving }: SavedRowView): string => {
    if (removed) return t('availability.removedRow', { name, label });
    const shown = leaving
        ? t('availability.withLeaving', { label: status, when: leaving.label })
        : status;
    return t('bookmark.open', { name, label, status: shown });
};

/**
 * 收藏 tab 一行（_mockups_/bookmark）：日期 / 集數 + 進度字 + 2px 進度線，右邊 ▷ / ⏸（同內頁集數清單一樣冇框白色）。
 * 撳 ▷ = 原地播 / 暫停；撳行其他位置 = 入嗰集（唔播）；左滑過四成移除（useRowSwipe）
 *
 * 已下架（P8 #6）：灰色「已下架」、冇 ▷、撳唔到（aria-disabled），照可以左滑 / Delete 移除
 */
export const SavedRow = ({ row }: { row: SavedRowView }) => {
    const { bindRow, bindCard, handlers, onKeyDown } = useRowSwipe(row.onRemove);
    return (
        <li
            ref={bindRow}
            className={styles.row}
            data-saved-row=""
            data-playing={String(row.playing)}
            data-removed={row.removed ? '' : undefined}
            data-zoom-key={row.zoomKey}
        >
            <div ref={bindCard} className={styles.card} {...handlers}>
                <span className={styles.trash} aria-hidden="true">
                    <TrashIcon size={ICON_SIZE} />
                </span>
                <button
                    type="button"
                    className={styles.open}
                    aria-label={openLabel(row)}
                    aria-disabled={row.removed ? 'true' : undefined}
                    aria-keyshortcuts="Delete"
                    title={t('bookmark.removeHint')}
                    onKeyDown={onKeyDown}
                    onClick={row.removed ? undefined : row.onOpen}
                >
                    <RowText row={row} />
                </button>
                {!row.removed && <PlayButton row={row} />}
            </div>
        </li>
    );
};
