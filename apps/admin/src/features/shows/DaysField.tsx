/* 播出日：日至六七粒（checkbox，揀咗嘅實色）。Design Origin: mockup #s3（.days） */
import type { Weekday } from '@903-player/catalog';
import { t } from '../../i18n/t';
import { toggleDay } from './showModel';

const WEEKDAYS = t('weekdays.short').split(',');

interface DaysFieldProps {
    label: string;
    days: readonly Weekday[];
    onChange: (days: Weekday[]) => void;
    inline?: boolean;
}

export function DaysField({ label, days, onChange, inline = false }: DaysFieldProps) {
    return (
        <span className={`days${inline ? ' inline' : ''}`} role="group" aria-label={label}>
            {WEEKDAYS.map((name, i) => {
                const day = i as Weekday;
                const on = days.includes(day);
                return (
                    <label key={name} className={on ? 'on' : undefined}>
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={on}
                            onChange={() => onChange(toggleDay(days, day))}
                        />
                        {name}
                    </label>
                );
            })}
        </span>
    );
}
