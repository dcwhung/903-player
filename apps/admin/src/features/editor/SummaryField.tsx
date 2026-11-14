/* 簡介（選填，≤ 500 字；空就刪欄位）；revert = 同已發佈唔同就出「已修改」「還原」+「已發佈：…」 */
import { SUMMARY_MAX_LENGTH } from '@903-player/catalog';
import { useId } from 'react';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { str } from '../../model/raw';
import { PublishedHint } from '../revert/FieldRevert';
import { RevertLabel } from '../revert/RevertLabel';
import type { EntryRevert } from '../revert/useEntryRevert';
import { withOptional } from '../shows/showModel';

const FIELDS = ['summary'];

interface SummaryFieldProps {
    target: RawDefinition;
    onChange: (update: (target: RawDefinition) => RawDefinition) => void;
    revert?: EntryRevert | undefined;
}

export function SummaryField({ target, onChange, revert }: SummaryFieldProps) {
    const id = useId();
    return (
        <div className="field wide">
            <RevertLabel label={t('fields.summary')} htmlFor={id} revert={revert} fields={FIELDS} />
            <textarea
                id={id}
                rows={3}
                maxLength={SUMMARY_MAX_LENGTH}
                placeholder={t('editor.optional')}
                value={str(target, 'summary') ?? ''}
                onChange={(event) =>
                    onChange((d) => withOptional(d, 'summary', event.target.value))
                }
            />
            {revert && <PublishedHint revert={revert} fields={FIELDS} />}
        </div>
    );
}
