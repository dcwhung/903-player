/* 基本資料：類型 SegmentedTabs（發佈咗 = 實色 pill）/ 上架日期 / 狀態 同一行（mockup ⑧ .row3） */
import { useId } from 'react';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { str } from '../../model/raw';
import { DateField } from '../../ui/DateField';
import { Pill } from '../../ui/Pill';
import { SegmentedTabs } from '../../ui/SegmentedTabs';
import { Tip } from '../../ui/Tip';
import { Toggle } from '../../ui/Toggle';
import { PublishedHint } from '../revert/FieldRevert';
import { RevertLabel } from '../revert/RevertLabel';
import { STATUS_FIELDS, StatusHint } from '../revert/StatusRevert';
import type { EntryRevert } from '../revert/useEntryRevert';
import { withOptional } from '../shows/showModel';

interface BasicFieldsProps {
    definition: RawDefinition;
    kindLocked: boolean;
    onChange: (update: (definition: RawDefinition) => RawDefinition) => void;
    revert?: EntryRevert | undefined;
}

const KIND = ['kind'];
const ADDED_AT = ['addedAt'];

const KIND_OPTIONS = [
    { value: 'series', label: t('drama.series') },
    { value: 'daily', label: t('drama.daily') },
] as const;

/** 狀態（上架 toggle）：還原連下架日期（removedAt）一齊 */
function StatusField({ definition, onChange, revert }: Omit<BasicFieldsProps, 'kindLocked'>) {
    const statusId = useId();
    return (
        <div className="field">
            <RevertLabel
                label={t('editor.status')}
                id={statusId}
                revert={revert}
                fields={STATUS_FIELDS}
            />
            <Toggle
                on={definition.enabled === true}
                labelledBy={statusId}
                onChange={(on) => onChange((d) => ({ ...d, enabled: on }))}
            />
            <StatusHint revert={revert} />
        </div>
    );
}

export function BasicFields({ definition, kindLocked, onChange, revert }: BasicFieldsProps) {
    const kind = definition.kind === 'daily' ? 'daily' : 'series';
    return (
        <div className="field wide">
            <div className="row3">
                <div className="field">
                    <RevertLabel label={t('drama.kind')} revert={revert} fields={KIND}>
                        {kindLocked && <Tip text={t('drama.kindLockedTip')} />}
                    </RevertLabel>
                    {kindLocked ? (
                        // 鎖住：直接顯示目前類型（實色 pill），唔出 disabled 分段掣
                        <span>
                            <Pill tone="solid">{t(`drama.${kind}`)}</Pill>
                        </span>
                    ) : (
                        <SegmentedTabs
                            mode="toggle"
                            label={t('drama.kind')}
                            value={kind}
                            options={KIND_OPTIONS}
                            onChange={(value) => onChange((d) => ({ ...d, kind: value }))}
                        />
                    )}
                </div>
                <div className="field">
                    <RevertLabel label={t('drama.addedAt')} revert={revert} fields={ADDED_AT} />
                    {/* DD/MM/YYYY + 月曆（用戶 2026-11-12，唔用 type="date"）；可留空 */}
                    <DateField
                        label={t('drama.addedAt')}
                        value={str(definition, 'addedAt') ?? ''}
                        onChange={(iso) => onChange((d) => withOptional(d, 'addedAt', iso))}
                    />
                    {revert && <PublishedHint revert={revert} fields={ADDED_AT} />}
                </div>
                <StatusField definition={definition} onChange={onChange} revert={revert} />
            </div>
        </div>
    );
}
