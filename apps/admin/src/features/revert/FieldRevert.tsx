/*
 * 編輯頁原位還原（mockup admin-revert ③）：欄位標題旁「已修改」+「還原」、輸入框下面「已發佈：…」、
 * 圖位鉛筆旁圓形還原掣、其他冇編輯位嘅欄位一行「其他已修改：…」。冇改動 = 乜都唔出
 */
import { t } from '../../i18n/t';
import { Pill } from '../../ui/Pill';
import { RevertButton } from './RevertButton';
import { RevertFlow } from './RevertFlow';
import { rowOf } from './revertRows';
import { changedFields, fieldChanged, type ImageSlot } from './revertScope';
import { valueText } from './revertValues';
import type { EntryRevert } from './useEntryRevert';
import { fieldLabel } from '../update/changeFields';

const HINT_SEPARATOR = '；';

const changedOf = (revert: EntryRevert, fields: readonly string[]) =>
    fields.filter((field) => fieldChanged(revert.scope, field));

interface FlowProps {
    revert: EntryRevert;
    fields: readonly string[];
    name: string;
    round?: boolean;
}

function Flow({ revert, fields, name, round = false }: FlowProps) {
    const { entry, scope } = revert;
    if (!entry || !scope) return null;
    return (
        <RevertFlow
            entry={entry}
            name={name}
            rows={fields.map((field) => rowOf(scope, field))}
            onDone={revert.onDone}
            trigger={(open) => (
                <RevertButton
                    label={t('revert.fieldLabel', { field: name })}
                    round={round}
                    blocked={revert.blocked}
                    onClick={open}
                />
            )}
        />
    );
}

/** 「已修改」+「還原」；fields 任何一個改咗就出（例如狀態 = enabled + removedAt） */
export function RevertMark({ revert, fields, name }: Omit<FlowProps, 'round'>) {
    const changed = changedOf(revert, fields);
    if (changed.length === 0) return null;
    return (
        <span className="revert-mark">
            <Pill tone="warn">{t('revert.modified')}</Pill>
            <Flow revert={revert} fields={changed} name={name} />
        </span>
    );
}

/** 「已發佈：…」（幾個欄位就逐個寫欄位名） */
export function PublishedHint({
    revert,
    fields,
}: {
    revert: EntryRevert;
    fields: readonly string[];
}) {
    const { scope } = revert;
    const changed = changedOf(revert, fields);
    if (!scope || changed.length === 0) return null;
    const value = changed
        .map((field) => {
            const text = valueText(field, scope.published.target[field]);
            return changed.length > 1
                ? `${fieldLabel(field, scope.arc !== undefined)} ${text}`
                : text;
        })
        .join(HINT_SEPARATOR);
    return <span className="published-hint">{t('revert.publishedValue', { value })}</span>;
}

/** 圖位鉛筆旁圓形還原掣（aria-label「還原橫圖」） */
export function SlotRevert({ revert, slot }: { revert: EntryRevert; slot: ImageSlot }) {
    if (!fieldChanged(revert.scope, slot)) return null;
    return <Flow revert={revert} fields={[slot]} name={t(`images.${slot}`)} round />;
}

/** 編輯頁冇位改嘅欄位（例如 R2 資料夾、各集標題；排序唔出，#6）：表格最尾一行 */
export function OtherRevert({
    revert,
    placed,
}: {
    revert: EntryRevert;
    placed: readonly string[];
}) {
    const { scope } = revert;
    const others = changedFields(scope).filter((field) => !placed.includes(field));
    if (!scope || others.length === 0) return null;
    const labels = [...new Set(others.map((field) => fieldLabel(field, scope.arc !== undefined)))];
    return (
        <div className="field wide revert-others">
            <span className="label-line">
                <Pill tone="warn">{t('revert.modified')}</Pill>
                <span className="muted small">
                    {t('revert.others', { fields: labels.join('、') })}
                </span>
                <Flow revert={revert} fields={others} name={t('revert.othersName')} />
            </span>
        </div>
    );
}
