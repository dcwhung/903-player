/*
 * 每頁一個儲存掣（mockup .savebar）：由待辦入嚟叫「儲存並返回待辦」，由列表入嚟叫「儲存」；
 * 有改動先出「● 有未儲存的變更（欄位）」，放喺儲存掣前面；「復原」放最左（同儲存掣分開，免得撳錯）；
 * 按鈕左邊 outline icon（mockup admin-style ④）
 */
import { Save, Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { t } from '../i18n/t';

interface SaveBarProps {
    dirtyFields: readonly string[];
    fromTodos: boolean;
    saving: boolean;
    onSave: () => void;
    onRevert?: () => void;
    /** 左邊額外掣（例如刪除） */
    start?: ReactNode;
    /** 有自動派嘅 ID 等確認：冇改動都可以撳「儲存」（3c confirm-id） */
    pendingConfirm?: boolean;
}

export function SaveBar({
    dirtyFields,
    fromTodos,
    saving,
    onSave,
    onRevert,
    start,
    pendingConfirm = false,
}: SaveBarProps) {
    const dirty = dirtyFields.length > 0;
    const label = fromTodos ? t('editor.saveAndBack') : t('editor.save');
    const note = dirty
        ? t('editor.dirty', { fields: dirtyFields.join('、') })
        : pendingConfirm
          ? t('editor.idUnconfirmed')
          : '';
    return (
        <div className="savebar">
            <div className="actions">
                {onRevert && dirty && (
                    <button type="button" onClick={onRevert} disabled={saving}>
                        <Undo2 aria-hidden="true" />
                        {t('editor.revert')}
                    </button>
                )}
                {start}
            </div>
            <div className="actions">
                {note && (
                    <span className="small dirty" role="status">
                        {note}
                    </span>
                )}
                <button
                    type="button"
                    className="primary"
                    onClick={onSave}
                    disabled={(!dirty && !pendingConfirm) || saving}
                >
                    <Save aria-hidden="true" />
                    {saving ? t('editor.saving') : label}
                </button>
            </div>
        </div>
    );
}
