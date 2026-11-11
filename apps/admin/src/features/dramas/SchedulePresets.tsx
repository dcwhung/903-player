/* 快速套用 chip（mockup ⑩ .presets）：一撳換成預設規則，由句子嘅開始日起 */
import { t, type MessageKey } from '../../i18n/t';
import {
    applyPreset,
    presetOf,
    PRESET_KEYS,
    type PresetKey,
    type ScheduleForm,
} from './scheduleModel';

const PRESET_LABEL: Record<PresetKey, MessageKey> = {
    all: 'schedule.presetAll',
    daily: 'schedule.presetDaily',
    mwf: 'schedule.presetMwf',
    weekly: 'schedule.presetWeekly',
};

export function SchedulePresets({
    form,
    start,
    onChange,
}: {
    form: ScheduleForm;
    start: string;
    onChange: (form: ScheduleForm) => void;
}) {
    const current = presetOf(form);
    return (
        <div className="presets" role="group" aria-label={t('schedule.presets')}>
            <span className="muted small">{t('schedule.presets')}</span>
            {PRESET_KEYS.map((key) => (
                <button
                    key={key}
                    type="button"
                    aria-pressed={current === key}
                    onClick={() => onChange(applyPreset(key, start))}
                >
                    {t(PRESET_LABEL[key])}
                </button>
            ))}
        </div>
    );
}
