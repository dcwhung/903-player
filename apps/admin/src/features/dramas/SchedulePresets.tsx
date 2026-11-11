/* 快速套用 chip（mockup ⑧ 上架 panel）：一撳換成預設上架規則，由句子嘅開始日起 */
import { t, type MessageKey } from '../../i18n/t';
import {
    applyPreset,
    presetOf,
    PRESET_KEYS,
    type ListingForm,
    type PresetKey,
} from './scheduleModel';

const PRESET_LABEL: Record<PresetKey, MessageKey> = {
    all: 'schedule.presetAll',
    daily: 'schedule.presetDaily',
    weekly: 'schedule.presetWeekly',
};

export function SchedulePresets({
    listing,
    start,
    onChange,
}: {
    listing: ListingForm;
    start: string;
    onChange: (listing: ListingForm) => void;
}) {
    const current = presetOf(listing);
    return (
        <div className="presets" role="group" aria-label={t('schedule.presets')}>
            <span className="muted small" aria-hidden="true">
                {t('schedule.presets')}
            </span>
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
