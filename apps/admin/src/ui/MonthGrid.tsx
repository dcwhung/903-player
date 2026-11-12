/* DateCalendar 嘅一個月日子格（role="grid"）：星期日開始，roving tabindex（只有 cursor 嗰日 Tab 入得） */
import type { KeyboardEvent } from 'react';
import { t } from '../i18n/t';
import { dayOf, formatDmy, monthWeeks, rangeProblem, weekdayOf } from './dateFieldModel';

const WEEKDAYS = t('weekdays.short').split(',');

const dayLabel = (iso: string, today: string) =>
    t(iso === today ? 'dateField.todayDay' : 'dateField.day', {
        date: formatDmy(iso),
        weekday: WEEKDAYS[weekdayOf(iso)] ?? '',
    });

export interface GridProps {
    min?: string | undefined;
    max?: string | undefined;
    cursor: string;
    value: string;
    today: string;
    titleId: string;
    onPick: (iso: string) => void;
    onKey: (event: KeyboardEvent<HTMLButtonElement>, iso: string) => void;
}

/** 一個月嘅日子格（role="grid"）：roving tabindex，只有 cursor 嗰日 Tab 入得 */
export function MonthGrid({ cursor, value, today, titleId, min, max, onPick, onKey }: GridProps) {
    return (
        <table className="date-grid" role="grid" aria-labelledby={titleId}>
            <thead>
                <tr>
                    {WEEKDAYS.map((name) => (
                        <th key={name} scope="col">
                            {name}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {monthWeeks(cursor).map((week, w) => (
                    <tr key={w}>
                        {week.map((iso, d) => (
                            <td
                                key={iso ?? `blank${d}`}
                                role="gridcell"
                                aria-selected={iso === null ? undefined : iso === value}
                            >
                                {iso && (
                                    <button
                                        type="button"
                                        data-iso={iso}
                                        tabIndex={iso === cursor ? 0 : -1}
                                        aria-label={dayLabel(iso, today)}
                                        aria-current={iso === today ? 'date' : undefined}
                                        aria-disabled={
                                            rangeProblem(iso, min, max) !== null || undefined
                                        }
                                        onClick={() => onPick(iso)}
                                        onKeyDown={(event) => onKey(event, iso)}
                                    >
                                        {dayOf(iso)}
                                    </button>
                                )}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
