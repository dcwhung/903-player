/*
 * 節目欄位：ID → 簡介 → 播出日 → 播放時間 → 主持（mockup ⑦ 一格包晒）
 */
import { useId } from 'react';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { str } from '../../model/raw';
import { Chips } from '../../ui/Chips';
import { TimeRoller } from '../../ui/TimeRoller';
import { Tip } from '../../ui/Tip';
import { Toggle } from '../../ui/Toggle';
import { IdField } from '../editor/IdField';
import { DaysField } from './DaysField';
import {
    DEFAULT_AIR_TIME,
    airDaysOf,
    airTimeOf,
    hostsOf,
    summaryOf,
    withOptional,
} from './showModel';

interface ShowFieldsProps {
    id: string;
    isNew: boolean;
    onId: (id: string) => void;
    definition: RawDefinition;
    onChange: (update: (definition: RawDefinition) => RawDefinition) => void;
}

export function ShowFields({ id, isNew, onId, definition, onChange }: ShowFieldsProps) {
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
                        <span id={statusId}>{t('editor.status')}</span>
                        <Toggle
                            on={definition.enabled !== false}
                            labelledBy={statusId}
                            onChange={(on) => set('enabled', on)}
                        />
                    </div>
                </div>
            </div>
            {isNew && <NewShowFields definition={definition} set={set} />}
            <label className="field wide">
                <span>{t('fields.summary')}</span>
                <textarea
                    rows={3}
                    value={summaryOf(definition)}
                    placeholder={t('editor.optional')}
                    onChange={(e) => set('summary', e.target.value)}
                />
            </label>
            <AirFields definition={definition} onChange={onChange} set={set} />
            <div className="field wide">
                <span>{t('show.hosts')}</span>
                <Chips
                    label={t('show.hosts')}
                    values={hostsOf(definition)}
                    onChange={(hosts) => set('hosts', hosts)}
                />
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

/** 播出日 + 播放時間（roller） */
function AirFields({
    definition,
    onChange,
    set,
}: Pick<ShowFieldsProps, 'definition' | 'onChange'> & {
    set: (key: string, value: unknown) => void;
}) {
    return (
        <>
            <div className="field wide">
                <span>{t('show.airDays')}</span>
                <DaysField
                    label={t('show.airDays')}
                    days={airDaysOf(definition)}
                    onChange={(days) => onChange((d) => ({ ...d, airDays: days }))}
                />
            </div>
            <div className="field wide">
                <span>
                    {t('show.airTime')} <Tip text={t('show.airTimeTip')} />
                </span>
                <TimeRoller
                    value={airTimeOf(definition) ?? DEFAULT_AIR_TIME}
                    onChange={(range) => set('airTime', range)}
                />
            </div>
        </>
    );
}
