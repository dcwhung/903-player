/*
 * 確認對話框（刪除 / 還原）：Design Origin: mockup: _mockups_/admin/index.html#s9（.scrim）
 * 開啟時 focus 入「取消」、Tab 喺掣之間循環、Esc 取消；關閉後 focus 返去原本個掣
 */
import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { t } from '../i18n/t';

interface ConfirmDialogProps {
    title: string;
    body: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    title,
    body,
    confirmLabel,
    danger = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const titleId = useId();
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        cancelRef.current?.focus();
        return () => opener?.focus();
    }, []);
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onCancel();
        if (event.key !== 'Tab') return;
        event.preventDefault();
        const next = document.activeElement === cancelRef.current ? confirmRef : cancelRef;
        next.current?.focus();
    };
    return (
        <div className="scrim" onKeyDown={onKeyDown}>
            <div className="card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
                <h3 id={titleId}>{title}</h3>
                <p className="sub">{body}</p>
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
