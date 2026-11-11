/*
 * 播放時間：兩個時間框平排，撳開彈出「時」「分」roller。Design Origin: mockup: _mockups_/admin/index.html#s3
 * 完結只可揀開始後 15 分鐘至 3 小時；改開始會自動收窄 / 調整完結（timeRollerModel）
 */
import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n/t';
import {
    adjustEnd,
    endOptions,
    hoursOf,
    minutesOf,
    startOptions,
    withHour,
    withMinute,
} from './timeRollerModel';
import { Wheel } from './Wheel';

export interface TimeRange {
    start: string;
    end: string;
}

interface TimeRollerProps {
    value: TimeRange;
    onChange: (value: TimeRange) => void;
}

type Which = 'start' | 'end';

function RollerPopover({
    label,
    options,
    value,
    onChange,
    onClose,
}: {
    label: string;
    options: readonly string[];
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
}) {
    const hour = value.slice(0, 2);
    return (
        <div
            className="roller-pop"
            role="dialog"
            aria-label={label}
            onKeyDown={(event) => {
                if (event.key === 'Escape' || event.key === 'Enter') onClose();
            }}
        >
            <Wheel
                label={t('show.hour')}
                values={hoursOf(options)}
                value={hour}
                onChange={(h) => onChange(withHour(options, value, h))}
            />
            <span className="colon" aria-hidden="true">
                :
            </span>
            <Wheel
                label={t('show.minute')}
                values={minutesOf(options, hour)}
                value={value.slice(3)}
                onChange={(m) => onChange(withMinute(options, value, m))}
                cyclic
            />
        </div>
    );
}

export function TimeRoller({ value, onChange }: TimeRollerProps) {
    const [open, setOpen] = useState<Which | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);
    const setStart = (start: string) =>
        onChange({ start, end: adjustEnd(value.start, value.end, start) });
    const setEnd = (end: string) => onChange({ ...value, end });
    const box = (which: Which) => (
        <button
            type="button"
            className={`time-box${open === which ? ' open' : ''}`}
            aria-expanded={open === which}
            aria-label={`${t(which === 'start' ? 'show.start' : 'show.end')} ${value[which]}`}
            onClick={() => setOpen(open === which ? null : which)}
        >
            {value[which]}
        </button>
    );
    return (
        <div ref={rootRef} className="time-roller">
            <div className="time-range">
                {box('start')}
                <span className="muted">{t('show.to')}</span>
                {box('end')}
            </div>
            {open && (
                <RollerPopover
                    label={t(open === 'start' ? 'show.start' : 'show.end')}
                    options={open === 'start' ? startOptions() : endOptions(value.start)}
                    value={value[open]}
                    onChange={open === 'start' ? setStart : setEnd}
                    onClose={() => setOpen(null)}
                />
            )}
        </div>
    );
}
