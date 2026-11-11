/* 簡介（選填，≤ 500 字；空就刪欄位） */
import { SUMMARY_MAX_LENGTH } from '@903-player/catalog';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { str } from '../../model/raw';
import { withOptional } from '../shows/showModel';

interface SummaryFieldProps {
    target: RawDefinition;
    onChange: (update: (target: RawDefinition) => RawDefinition) => void;
}

export function SummaryField({ target, onChange }: SummaryFieldProps) {
    return (
        <label className="field wide">
            <span>{t('fields.summary')}</span>
            <textarea
                rows={3}
                maxLength={SUMMARY_MAX_LENGTH}
                placeholder={t('editor.optional')}
                value={str(target, 'summary') ?? ''}
                onChange={(event) =>
                    onChange((d) => withOptional(d, 'summary', event.target.value))
                }
            />
        </label>
    );
}
