/*
 * 確認對話框（刪除 / 還原）：Design Origin: mockup: _mockups_/admin/index.html#s9（.scrim）
 * 開啟時 focus 入「取消」、Tab 喺掣之間循環、Esc 取消；關閉後 focus 返去原本個掣
 */
import { useId } from 'react';
import { t } from '../i18n/t';
import { useDialogFocus } from './useDialogFocus';

interface ConfirmDialogProps {
    title: string;
    body: string;
    /** 補充提示（例如還原嘅限制），以 warn 樣式顯示喺 body 下面 */
    note?: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    title,
    body,
    note,
    confirmLabel,
    danger = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const titleId = useId();
    const { cancelRef, confirmRef, onKeyDown } = useDialogFocus(onCancel);
    return (
        <div className="scrim" onKeyDown={onKeyDown}>
            <div className="card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
                <h3 id={titleId}>{title}</h3>
                <p className="sub">{body}</p>
                {note && <p className="note warn">{note}</p>}
                <div className="actions end">
                    <button type="button" ref={cancelRef} onClick={onCancel}>
                        {t('editor.cancel')}
                    </button>
                    <button
                        type="button"
                        ref={confirmRef}
                        className={danger ? 'danger' : 'primary'}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
