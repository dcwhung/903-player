import type { KeyboardEvent } from 'react';
import styles from './SavedTab.module.css';
import { useRemoveHintId } from './removeHint';
import { SavedRowText } from './SavedRowText';
import { openLabel } from './savedRowState';
import type { SavedRowView } from './savedTypes';

interface SavedOpenButtonProps {
    row: SavedRowView;
    /** Delete / Backspace 移除（useRowSwipe） */
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * 撳行（▷ 以外）= 入嗰集（唔播）。已下架撳唔到（aria-disabled），照可以 Delete 移除；
 * 移除提示用共用隱藏說明（aria-describedby，B2b），唔用 title
 */
export const SavedOpenButton = ({ row, onKeyDown }: SavedOpenButtonProps) => {
    const hintId = useRemoveHintId();
    return (
        <button
            type="button"
            className={styles.open}
            aria-label={openLabel(row)}
            aria-disabled={row.removed ? 'true' : undefined}
            aria-keyshortcuts="Delete Backspace"
            aria-describedby={hintId}
            onKeyDown={onKeyDown}
            onClick={row.removed ? undefined : row.onOpen}
        >
            <SavedRowText row={row} />
        </button>
    );
};
