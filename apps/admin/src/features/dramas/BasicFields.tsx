/* 基本資料：類型 switch / 上架日期 / 狀態 同一行（mockup ⑧ .row3） */
import { useId } from 'react';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { str } from '../../model/raw';
import { Switch } from '../../ui/Switch';
import { Toggle } from '../../ui/Toggle';
import { withOptional } from '../shows/showModel';

interface BasicFieldsProps {
    definition: RawDefinition;
    kindLocked: boolean;
    onChange: (update: (definition: RawDefinition) => RawDefinition) => void;
}

const KIND_OPTIONS = [
    { value: 'series', label: t('drama.series') },
    { value: 'daily', label: t('drama.daily') },
] as const;

export function BasicFields({ definition, kindLocked, onChange }: BasicFieldsProps) {
    const statusId = useId();
    const kind = definition.kind === 'daily' ? 'daily' : 'series';
    return (
        <div className="field wide">
            <div className="row3">
                <div className="field">
                    <span>{t('drama.kind')}</span>
                    <Switch
                        label={t('drama.kind')}
                        value={kind}
                        options={KIND_OPTIONS}
                        disabled={kindLocked}
                        title={kindLocked ? t('drama.kindLockedTip') : undefined}
                        onChange={(value) => onChange((d) => ({ ...d, kind: value }))}
                    />
                </div>
                <label className="field">
                    <span>{t('drama.addedAt')}</span>
                    <input
                        type="date"
                        value={str(definition, 'addedAt') ?? ''}
                        onChange={(e) =>
                            onChange((d) => withOptional(d, 'addedAt', e.target.value))
                        }
                    />
                </label>
                <div className="field">
                    <span id={statusId}>{t('editor.status')}</span>
                    <Toggle
                        on={definition.enabled === true}
                        labelledBy={statusId}
                        onChange={(on) => onChange((d) => ({ ...d, enabled: on }))}
                    />
                </div>
            </div>
        </div>
    );
}
