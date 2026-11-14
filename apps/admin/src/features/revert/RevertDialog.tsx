/*
 * 還原確認框：Design Origin: mockup: _mockups_/admin-revert/index.html#b（②）
 * 「還原<名>？」+ 逐項剔格（預設全剔）→「還原 N 項」（冇剔 = 灰）；Esc / 撳外面 / 取消 = 關閉（還原中唔收）
 */
import { Undo2, X } from 'lucide-react';
import { useId, useState, type RefObject } from 'react';
import type { RevertItem } from '../../api/types';
import { t } from '../../i18n/t';
import { useModalKeys } from '../../ui/useModalKeys';
import { DiffRow } from './DiffRow';
import type { RevertRow } from './revertRows';

export interface RevertDialogProps {
    name: string;
    rows: readonly RevertRow[];
    busy: boolean;
    error?: string | undefined;
    onConfirm: (items: RevertItem[]) => void;
    onCancel: () => void;
}

const toggled = (set: ReadonlySet<string>, key: string): ReadonlySet<string> => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
};

interface DialogActionsProps {
    cancelRef: RefObject<HTMLButtonElement | null>;
    busy: boolean;
    count: number;
    onCancel: () => void;
    onConfirm: () => void;
}

function DialogActions({ cancelRef, busy, count, onCancel, onConfirm }: DialogActionsProps) {
    return (
        <div className="actions end">
            <button type="button" ref={cancelRef} disabled={busy} onClick={onCancel}>
                <X aria-hidden="true" />
                {t('editor.cancel')}
            </button>
            <button
                type="button"
                className="revert-btn dialog-revert"
                disabled={busy || count === 0}
                onClick={onConfirm}
            >
                <Undo2 aria-hidden="true" />
                {busy ? t('revert.busy') : t('revert.confirm', { count })}
            </button>
        </div>
    );
}

export function RevertDialog({ name, rows, busy, error, onConfirm, onCancel }: RevertDialogProps) {
    const titleId = useId();
    const [unchecked, setUnchecked] = useState<ReadonlySet<string>>(new Set());
    const { dialogRef, cancelRef, scrimProps } = useModalKeys(onCancel, busy);
    const picked = rows.filter((row) => !unchecked.has(row.key));
    return (
        <div className="scrim" {...scrimProps}>
            <div
                ref={dialogRef}
                className="card revert-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
            >
                <h3 id={titleId}>{t('revert.dialogTitle', { name })}</h3>
                <p className="sub">{t('revert.dialogSub')}</p>
                <div className="diff">
                    {rows.map((row) => (
                        <DiffRow
                            key={row.key}
                            row={row}
                            checked={!unchecked.has(row.key)}
                            onToggle={() => setUnchecked((set) => toggled(set, row.key))}
                        />
                    ))}
                </div>
                {error && (
                    <p className="note bad" role="alert">
                        {error}
                    </p>
                )}
                <DialogActions
                    cancelRef={cancelRef}
                    busy={busy}
                    count={picked.length}
                    onCancel={onCancel}
                    onConfirm={() => onConfirm(picked.map((row) => row.item))}
                />
            </div>
        </div>
    );
}
