/*
 * 名單 chips（主持 / 聲演）：輸入後 Enter 加、✕ 移除、拖 ⠿ 排序。Design Origin: mockup: _mockups_/admin/index.html#s3（.chips）
 * 上限同 catalog textFields：每個 1–40 字、最多 12 個
 */
import { NAME_LIST_MAX_ITEMS, NAME_MAX_LENGTH } from '@903-player/catalog';
import { X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { t } from '../i18n/t';
import { SortableList } from './SortableList';

interface ChipsProps {
    label: string;
    values: readonly string[];
    onChange: (values: string[]) => void;
}

export function Chips({ label, values, onChange }: ChipsProps) {
    const [text, setText] = useState('');
    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
        event.preventDefault();
        const name = text.trim();
        if (name === '' || values.includes(name) || values.length >= NAME_LIST_MAX_ITEMS) return;
        onChange([...values, name]);
        setText('');
    };
    return (
        <div className="chips">
            <SortableList
                items={values}
                idOf={(name) => name}
                labelOf={(name) => name}
                onReorder={onChange}
                layout="wrap"
                renderItem={(name, sortable) => (
                    <span ref={sortable.ref} style={sortable.style} className="chip">
                        {sortable.handle}
                        {name}
                        <button
                            type="button"
                            className="chip-remove"
                            aria-label={t('show.removeChip', { name })}
                            onClick={() => onChange(values.filter((v) => v !== name))}
                        >
                            <X aria-hidden="true" />
                        </button>
                    </span>
                )}
            />
            <input
                type="text"
                aria-label={label}
                maxLength={NAME_MAX_LENGTH}
                placeholder={t('show.chipsPlaceholder')}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={onKeyDown}
            />
        </div>
    );
}
