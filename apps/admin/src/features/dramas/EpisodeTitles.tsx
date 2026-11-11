/*
 * 各集標題 textarea：每行「第 X 集 ｜ 標題」（formatTitles / parseTitles），錯誤指明第幾行；
 * 3c：唔再收埋，textarea 跟內容自動高（field-sizing: content；唔支援嘅 browser 用行數做 rows）
 * Design Origin: mockup: _mockups_/admin/index.html#s5（textarea.ep-titles）
 */
import { formatTitles, parseTitles, type TitledArc } from '@903-player/catalog';
import { useEffect, useId, useState } from 'react';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { countOf, firstNoOf } from '../../model/raw';

interface EpisodeTitlesProps {
    arc: RawDefinition;
    onTitles: (titles: Record<string, string>) => void;
    onErrors: (count: number) => void;
}

export function EpisodeTitles({ arc, onTitles, onErrors }: EpisodeTitlesProps) {
    const [text, setText] = useState(() => formatTitles(arc as TitledArc));
    const [errors, setErrors] = useState<string[]>([]);
    const errorId = useId();
    const count = countOf(arc);
    useEffect(() => () => onErrors(0), [onErrors]);
    const onChange = (value: string) => {
        setText(value);
        const parsed = parseTitles(value, firstNoOf(arc), count);
        setErrors(parsed.errors.map((error) => error.message));
        onErrors(parsed.errors.length);
        if (parsed.errors.length === 0) onTitles(parsed.titles);
    };
    return (
        <div className="field wide">
            <span>{t('drama.titles', { count })}</span>
            <textarea
                className="ep-titles autosize"
                rows={Math.max(2, text.split('\n').length)}
                spellCheck={false}
                aria-label={t('fields.titles')}
                placeholder={t('drama.titlesPlaceholder')}
                aria-invalid={errors.length > 0 ? true : undefined}
                aria-describedby={errorId}
                value={text}
                onChange={(event) => onChange(event.target.value)}
            />
            <span id={errorId} className="small muted">
                {t('drama.titlesHelp')}
            </span>
            {errors.length > 0 && (
                <ul className="err small" role="alert">
                    {errors.map((message) => (
                        <li key={message}>{message}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
