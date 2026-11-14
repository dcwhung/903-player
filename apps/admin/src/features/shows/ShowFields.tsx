/*
 * 節目欄位：ID → 簡介 → 播出日 → 播放時間 → 主持（mockup ⑦ 一格包晒）
 */
import { useId } from 'react';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { str } from '../../model/raw';
import { Chips } from '../../ui/Chips';
import { Tip } from '../../ui/Tip';
import { Toggle } from '../../ui/Toggle';
import { IdField } from '../editor/IdField';
import { SummaryField } from '../editor/SummaryField';
import { PublishedHint } from '../revert/FieldRevert';
import { RevertLabel } from '../revert/RevertLabel';
import { STATUS_FIELDS, StatusHint } from '../revert/StatusRevert';
import type { EntryRevert } from '../revert/useEntryRevert';
import { AirTimeField } from './AirTimeField';
import { DaysField } from './DaysField';
import { airDaysOf, hostsOf, withOptional } from './showModel';

interface ShowFieldsProps {
    id: string;
    isNew: boolean;
    onId: (id: string) => void;
    definition: RawDefinition;
    onChange: (update: (definition: RawDefinition) => RawDefinition) => void;
    /** 已發佈節目：同已發佈唔同嘅欄位出「已修改」「還原」 */
    revert?: EntryRevert | undefined;
}

export function ShowFields({ id, isNew, onId, definition, onChange, revert }: ShowFieldsProps) {
    const statusId = useId();
    const set = (key: string, value: unknown) => onChange((d) => withOptional(d, key, value));
    return (
        <>
            <div className="field wide">
                <div className="row3">
                    <IdField
                        value={id}
                        editable={isNew}
                        tip={t('editor.idShowTip')}
                        onChange={onId}
                    />
                    <div className="field">
                        <RevertLabel
                            label={t('editor.status')}
                            id={statusId}
                            revert={revert}
                            fields={STATUS_FIELDS}
                        />
                        <Toggle
                            on={definition.enabled !== false}
                            labelledBy={statusId}
                            onChange={(on) => set('enabled', on)}
                        />
                        <StatusHint revert={revert} />
                    </div>
                </div>
            </div>
            {isNew && <NewShowFields definition={definition} set={set} />}
            <SummaryField target={definition} onChange={onChange} revert={revert} />
            <AirFields definition={definition} onChange={onChange} set={set} revert={revert} />
            <div className="field wide">
                <RevertLabel label={t('show.hosts')} revert={revert} fields={HOSTS} />
                <Chips
                    label={t('show.hosts')}
                    values={hostsOf(definition)}
                    onChange={(hosts) => set('hosts', hosts)}
                />
                {revert && <PublishedHint revert={revert} fields={HOSTS} />}
            </div>
        </>
    );
}

/** 新增節目先要嘅欄位：名稱、錄音檔時間 */
function NewShowFields({
    definition,
    set,
}: {
    definition: RawDefinition;
    set: (key: string, value: unknown) => void;
}) {
    return (
        <div className="field wide">
            <div className="row3">
                <label className="field">
                    <span>{t('fields.name')}</span>
                    <input
                        type="text"
                        value={str(definition, 'name') ?? ''}
                        onChange={(e) => set('name', e.target.value)}
                    />
                </label>
                <label className="field">
                    <span>
                        {t('show.fileTime')} <Tip text={t('show.fileTimeTip')} />
                    </span>
                    <input
                        type="text"
                        className="mono"
                        inputMode="numeric"
                        maxLength={4}
                        value={str(definition, 'fileTime') ?? ''}
                        onChange={(e) => set('fileTime', e.target.value)}
                    />
                </label>
            </div>
        </div>
    );
}

const HOSTS = ['hosts'];
const AIR_DAYS = ['airDays'];

/** 播出日 + 播放時間（roller） */
function AirFields({
    definition,
    onChange,
    set,
    revert,
}: Pick<ShowFieldsProps, 'definition' | 'onChange' | 'revert'> & {
    set: (key: string, value: unknown) => void;
}) {
    return (
        <>
            <div className="field wide">
                <RevertLabel label={t('show.airDays')} revert={revert} fields={AIR_DAYS} />
                <DaysField
                    label={t('show.airDays')}
                    days={airDaysOf(definition)}
                    onChange={(days) => onChange((d) => ({ ...d, airDays: days }))}
                />
                {revert && <PublishedHint revert={revert} fields={AIR_DAYS} />}
            </div>
            <AirTimeField definition={definition} set={set} revert={revert} />
        </>
    );
}
