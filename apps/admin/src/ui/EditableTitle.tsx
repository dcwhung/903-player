/*
 * 標題雙擊改名（Enter 即存、Esc 取消）。Design Origin: mockup: _mockups_/admin/index.html#s3（.editable / .title-edit）
 * 鍵盤：focus 標題撳 Enter 都可以開始改
 */
import { Check, X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { t } from '../i18n/t';

interface EditableTitleProps {
    value: string;
    onSave: (value: string) => void | Promise<void>;
}

interface TitleEditorProps {
    text: string;
    onText: (text: string) => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    onCommit: () => void;
    onCancel: () => void;
}

function TitleEditor({ text, onText, onKeyDown, onCommit, onCancel }: TitleEditorProps) {
    return (
        <span className="title-edit">
            <input
                type="text"
                aria-label={t('editor.renameLabel')}
                value={text}
                autoFocus
                onChange={(event) => onText(event.target.value)}
                onKeyDown={onKeyDown}
            />
            <button
                type="button"
                className="primary"
                aria-label={t('editor.renameSave')}
                onClick={onCommit}
            >
                <Check aria-hidden="true" />
            </button>
            <button type="button" aria-label={t('editor.renameCancel')} onClick={onCancel}>
                <X aria-hidden="true" />
            </button>
        </span>
    );
}

export function EditableTitle({ value, onSave }: EditableTitleProps) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(value);
    const start = () => {
        setText(value);
        setEditing(true);
    };
    const commit = async () => {
        const next = text.trim();
        setEditing(false);
        if (next !== '' && next !== value) await onSave(next);
    };
    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') void commit();
        if (event.key === 'Escape') setEditing(false);
    };
    if (!editing)
        return (
            <span
                className="editable"
                title={t('editor.renameTip')}
                tabIndex={0}
                role="button"
                aria-label={`${t('editor.renameLabel')}：${value}（${t('editor.renameTip')}）`}
                onDoubleClick={start}
                onKeyDown={(event) => event.key === 'Enter' && start()}
            >
                {value}
            </span>
        );
    return (
        <TitleEditor
            text={text}
            onText={setText}
            onKeyDown={onKeyDown}
            onCommit={() => void commit()}
            onCancel={() => setEditing(false)}
        />
    );
}
