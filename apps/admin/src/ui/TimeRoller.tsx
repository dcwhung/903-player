/*
 * 播放時間：兩個時間框平排，撳開喺嗰個框下面彈出「時」「分」roller（每個框一個 .time-slot）。Design Origin: mockup: _mockups_/admin/index.html#s3
 * 完結只可揀開始後 15 分鐘至 3 小時；改開始會自動收窄 / 調整完結（timeRollerModel）
 */
import { useRef, useState } from 'react';
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
import { useOutsidePointer } from './useOutsidePointer';
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
    // 關 roller 之後 focus 返去撳開佢嗰個時間框
    const close = () => {
        const which = open;
        setOpen(null);
        rootRef.current?.querySelector<HTMLButtonElement>(`[data-which="${which}"]`)?.focus();
    };
    useOutsidePointer(rootRef, open !== null, () => setOpen(null));
    const setStart = (start: string) =>
        onChange({ start, end: adjustEnd(value.start, value.end, start) });
    const setEnd = (end: string) => onChange({ ...value, end });
    const box = (which: Which) => (
        <span className="time-slot">
            <button
                type="button"
                className={`time-box${open === which ? ' open' : ''}`}
                aria-expanded={open === which}
                aria-label={`${t(which === 'start' ? 'show.start' : 'show.end')} ${value[which]}`}
                data-which={which}
                onClick={() => setOpen(open === which ? null : which)}
            >
                {value[which]}
            </button>
            {open === which && (
                <RollerPopover
                    label={t(which === 'start' ? 'show.start' : 'show.end')}
                    options={which === 'start' ? startOptions() : endOptions(value.start)}
                    value={value[which]}
                    onChange={which === 'start' ? setStart : setEnd}
                    onClose={close}
                />
            )}
        </span>
    );
    return (
        <div ref={rootRef} className="time-roller">
            <div className="time-range">
                {box('start')}
                <span className="muted">{t('show.to')}</span>
                {box('end')}
            </div>
        </div>
    );
}
