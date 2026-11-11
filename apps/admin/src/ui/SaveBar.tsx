/*
 * 每頁一個儲存掣（mockup .savebar）：由待辦入嚟叫「儲存並返回待辦」，由列表入嚟叫「儲存」；
 * 有改動先出「● 有未儲存的變更（欄位）」
 */
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
}

export function SaveBar({ dirtyFields, fromTodos, saving, onSave, onRevert, start }: SaveBarProps) {
    const dirty = dirtyFields.length > 0;
    const label = fromTodos ? t('editor.saveAndBack') : t('editor.save');
    return (
        <div className="savebar">
            <div className="actions">
                {start}
                {dirty && (
                    <span className="small dirty" role="status">
                        {t('editor.dirty', { fields: dirtyFields.join('、') })}
                    </span>
                )}
            </div>
            <div className="actions">
                {onRevert && dirty && (
                    <button type="button" onClick={onRevert} disabled={saving}>
                        {t('editor.revert')}
                    </button>
                )}
                <button
                    type="button"
                    className="primary"
                    onClick={onSave}
                    disabled={!dirty || saving}
                >
                    {saving ? t('editor.saving') : label}
                </button>
            </div>
        </div>
    );
}
