/*
 * DateField 嘅月曆 popover（用戶 2026-11-12）：上 / 下一個月 icon 掣、星期日開始（日 一 … 六，同星期掣一樣）、
 * 標今日、揀咗嘅日子實色。方向鍵移日 / 週、PageUp / PageDown 移月、Enter 揀、Esc 收起（focus 交返 DateField）
 */
import { addDays, hkToday } from '@903-player/catalog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { t } from '../i18n/t';
import { addMonths, rangeProblem, yearMonthOf } from './dateFieldModel';
import { MonthGrid } from './MonthGrid';
import { usePopoverPlacement } from './usePopoverPlacement';
const DAYS_PER_WEEK = 7;
const DAY_STEPS: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -DAYS_PER_WEEK,
    ArrowDown: DAYS_PER_WEEK,
};
const MONTH_STEPS: Record<string, number> = { PageUp: -1, PageDown: 1 };

interface Limits {
    min?: string | undefined;
    max?: string | undefined;
}

export interface DateCalendarProps extends Limits {
    label: string;
    value: string;
    onPick: (iso: string) => void;
    onClose: () => void;
}

/**
 * 月曆而家指住邊日（cursor）：方向鍵移日 / 週、PageUp / PageDown 移月、Enter 揀；
 * 鍵盤 / 啱啱打開先 focus 去日子，撳上 / 下一個月掣就留喺個掣
 */
const useCursor = (
    rootRef: RefObject<HTMLElement | null>,
    initial: string,
    pick: (iso: string) => void,
) => {
    const [cursor, setCursor] = useState(initial);
    const focusDay = useRef(true);
    useEffect(() => {
        if (!focusDay.current) return;
        rootRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${cursor}"]`)?.focus();
    }, [rootRef, cursor]);
    const move = (next: string, toDay: boolean) => {
        focusDay.current = toDay;
        setCursor(next);
    };
    const onKey = (event: KeyboardEvent<HTMLButtonElement>, iso: string) => {
        const days = DAY_STEPS[event.key];
        const months = MONTH_STEPS[event.key];
        if (days !== undefined) move(addDays(iso, days), true);
        else if (months !== undefined) move(addMonths(iso, months), true);
        else if (event.key === 'Enter') pick(iso);
        else return;
        event.preventDefault();
    };
    return { cursor, move, onKey };
};

/** 上 / 下一個月 icon 掣 */
function MonthNav({ step, onClick }: { step: -1 | 1; onClick: () => void }) {
    return (
        <button
            type="button"
            className="date-nav"
            aria-label={t(step < 0 ? 'dateField.prevMonth' : 'dateField.nextMonth')}
            onClick={onClick}
        >
            {step < 0 ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
        </button>
    );
}

export function DateCalendar({ label, value, min, max, onPick, onClose }: DateCalendarProps) {
    // 今日 = 香港日子（排程用同一個，S-835）
    const today = hkToday();
    const rootRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const placement = usePopoverPlacement(rootRef);
    const pick = (iso: string) => {
        if (rangeProblem(iso, min, max) === null) onPick(iso);
    };
    const { cursor, move, onKey } = useCursor(
        rootRef,
        value || (min && today < min ? min : today),
        pick,
    );
    const { year, month } = yearMonthOf(cursor);
    return (
        <div
            ref={rootRef}
            className="date-pop"
            data-placement={placement}
            role="dialog"
            aria-label={t('dateField.open', { label })}
            onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                event.stopPropagation();
                onClose();
            }}
        >
            <div className="date-pop-head">
                <MonthNav step={-1} onClick={() => move(addMonths(cursor, -1), false)} />
                <span id={titleId} className="date-pop-title" aria-live="polite">
                    {t('dateField.month', { year, month })}
                </span>
                <MonthNav step={1} onClick={() => move(addMonths(cursor, 1), false)} />
            </div>
            <MonthGrid
                cursor={cursor}
                value={value}
                today={today}
                titleId={titleId}
                min={min}
                max={max}
                onPick={pick}
                onKey={onKey}
            />
        </div>
    );
}
