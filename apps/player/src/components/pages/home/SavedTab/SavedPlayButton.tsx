import type { PointerEvent } from 'react';
import { t } from '../../../../i18n/t';
import { PauseIcon, PlayIcon } from '../../../shared/common/icons/icons';
import styles from './SavedTab.module.css';
import { SAVED_ROW_ICON_SIZE } from './savedRowState';
import type { SavedRowView } from './savedTypes';

/** ▷ 唔好開始左滑（撳掣 = 原地播） */
const keepPointer = (event: PointerEvent<HTMLButtonElement>) => event.stopPropagation();

/** ▷ / ⏸：原地播 / 暫停（已下架冇）；讀屏名用讀屏版日子（17/10 星期六） */
export const SavedPlayButton = ({ row }: { row: SavedRowView }) => {
    const { name, spokenLabel: label } = row;
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
                <PauseIcon size={SAVED_ROW_ICON_SIZE} />
            ) : (
                <PlayIcon size={SAVED_ROW_ICON_SIZE} filled={false} />
            )}
        </button>
    );
};
