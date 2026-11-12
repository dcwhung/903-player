/*
 * DateField 打字部分（用戶 2026-11-12）：欄位文字 DD/MM/YYYY；打啱一個完整又喺範圍內嘅日子即刻 onChange（ISO），
 * 離開欄位 / Enter 先驗證出錯誤；外面改咗值（例如揀快速套用）就跟返、清走錯誤
 */
import { useState } from 'react';
import { t } from '../i18n/t';
import { formatDmy, parseDmy, rangeProblem } from './dateFieldModel';

export interface DateLimits {
    min?: string | undefined;
    max?: string | undefined;
    required?: boolean;
}

/** 冇問題 = null，否則係錯誤訊息 */
const problemOf = (text: string, { min, max, required = false }: DateLimits): string | null => {
    if (text.trim() === '') return required ? t('dateField.required') : null;
    const iso = parseDmy(text);
    if (iso === null) return t('dateField.invalid');
    const range = rangeProblem(iso, min, max);
    if (range === 'min') return t('dateField.min', { date: formatDmy(min ?? '') });
    if (range === 'max') return t('dateField.max', { date: formatDmy(max ?? '') });
    return null;
};

/** 欄位文字 + 錯誤；外面改咗值（例如揀快速套用）就跟返、清走錯誤；emit = 生效（onChange ISO） */
const useSyncedText = (value: string, onChange: (iso: string) => void) => {
    const [text, setText] = useState(() => formatDmy(value));
    const [shown, setShown] = useState(value);
    const [error, setError] = useState<string | null>(null);
    if (value !== shown) {
        setShown(value);
        setText(formatDmy(value));
        setError(null);
    }
    const emit = (iso: string) => {
        setError(null);
        setShown(iso);
        if (iso !== value) onChange(iso);
    };
    return { text, setText, error, setError, emit };
};

export const useDateText = (value: string, onChange: (iso: string) => void, limits: DateLimits) => {
    const { text, setText, error, setError, emit } = useSyncedText(value, onChange);
    return {
        text,
        error,
        /** 打字：清空（非必填）或者打啱完整日子就即刻生效 */
        type: (next: string) => {
            setText(next);
            const iso = parseDmy(next);
            if (next.trim() === '' && !limits.required) emit('');
            else if (iso !== null && problemOf(next, limits) === null) emit(iso);
        },
        /** 離開欄位 / Enter：驗證，啱就整齊返做 DD/MM/YYYY */
        check: () => {
            const iso = parseDmy(text);
            const problem = problemOf(text, limits);
            setError(problem);
            if (problem === null && iso !== null) setText(formatDmy(iso));
        },
        /** 月曆揀咗 */
        accept: (iso: string) => {
            setText(formatDmy(iso));
            emit(iso);
        },
    };
};
