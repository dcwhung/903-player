/* 名稱與簡介草稿：由已存值起草，追蹤「有改」「可儲存」「App 名有改」；重新載入（儲存 / 還原後）會 reset */
import { useState } from 'react';
import type { BrandingText } from '../../api/types';
import { canSave, draftOf, isDirty, nameChanged, textBody, type TextDraft } from './brandingModel';

export const useTextDraft = (text: BrandingText | null, pending = false) => {
    const saved = draftOf(text);
    const key = JSON.stringify(saved);
    const [value, setValue] = useState<TextDraft>(saved);
    // 儲存 / 還原後重讀：已存值（key）一變就 reset 草稿（render 階段，唔使 effect）
    const [lastKey, setLastKey] = useState(key);
    if (key !== lastKey) {
        setLastKey(key);
        setValue(saved);
    }
    return {
        value,
        set: (field: keyof TextDraft, next: string) =>
            setValue((current) => ({ ...current, [field]: next })),
        dirty: isDirty(value, saved),
        canSave: canSave(value, saved),
        nameChanged: nameChanged(value, saved),
        pending,
        body: () => textBody(value),
    };
};

export type TextForm = ReturnType<typeof useTextDraft>;
