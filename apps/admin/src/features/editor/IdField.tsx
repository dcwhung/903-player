/*
 * ID 欄：發佈咗就唯讀（ⓘ 講原因）；未發佈可改（細楷英數同連字號，錯誤貼住欄位）；
 * 掃描自動派嘅 ID 未確認 → 紅框 + 紅 label（mockup admin-style ⑤）
 * Design Origin: mockup: _mockups_/admin/index.html#s4 / #s9（422 欄位錯誤）
 */
import { ID_PATTERN } from '@903-player/catalog';
import { useId } from 'react';
import { t } from '../../i18n/t';
import { Tip } from '../../ui/Tip';

interface IdFieldProps {
    label?: string;
    value: string;
    editable: boolean;
    tip: string;
    onChange?: (value: string) => void;
    /** 掃描自動派、未確認：欄同 label 一齊紅（3c，唔再出「須設定 ID」） */
    unconfirmed?: boolean;
}

export const idProblem = (value: string): string | undefined =>
    value === ''
        ? t('editor.required')
        : ID_PATTERN.test(value)
          ? undefined
          : t('editor.idPattern');

export function IdField({
    label = t('editor.id'),
    value,
    editable,
    tip,
    onChange,
    unconfirmed = false,
}: IdFieldProps) {
    const errorId = useId();
    const problem = editable ? idProblem(value) : undefined;
    return (
        <label className={`field${unconfirmed && !problem ? ' unconfirmed' : ''}`}>
            <span>
                {label} <Tip text={tip} />
            </span>
            <input
                type="text"
                className="mono"
                value={value}
                readOnly={!editable}
                placeholder={t('editor.idPlaceholder')}
                aria-invalid={problem ? true : undefined}
                aria-describedby={problem ? errorId : undefined}
                onChange={(event) => onChange?.(event.target.value.trim())}
            />
            {problem && (
                <span className="err" id={errorId}>
                    {problem}
                </span>
            )}
        </label>
    );
}
