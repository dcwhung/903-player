/*
 * 排程句子共用部分：日期欄（ui/DateField）、「由 ⟨日期⟩ 起，逢 ⟨星期⟩，每次上架 / 下架 ⟨N⟩ 集」（上架、下架兩邊對稱，mockup ⑧）
 */
import type { Weekday } from '@903-player/catalog';
import { t, type MessageKey } from '../../i18n/t';
import { DateField } from '../../ui/DateField';
import { DaysField } from '../shows/DaysField';
import { weekdaysOf, type Every } from './scheduleModel';

const MAX_PER_RELEASE = 99;

interface Periodic {
    start: string;
    every: Every;
    perRelease: number;
}

interface CadenceLabels {
    start: MessageKey;
    weekdays: MessageKey;
    each: MessageKey;
    perRelease: MessageKey;
}

export const LISTING_LABELS: CadenceLabels = {
    start: 'schedule.startLabel',
    weekdays: 'schedule.weekdaysLabel',
    each: 'schedule.eachList',
    perRelease: 'schedule.perRelease',
};

export const UNLIST_LABELS: CadenceLabels = {
    start: 'schedule.unlistStartLabel',
    weekdays: 'schedule.unlistWeekdaysLabel',
    each: 'schedule.eachUnlist',
    perRelease: 'schedule.unlistPerRelease',
};

export const positive = (value: string, max: number) =>
    Math.min(max, Math.max(1, Number(value) || 1));

/** 句子入面嘅日期欄：ui/DateField（DD/MM/YYYY + 月曆），必填 */
export function SentenceDate({
    label,
    value,
    min,
    onChange,
}: {
    label: MessageKey;
    value: string;
    min?: string | undefined;
    onChange: (date: string) => void;
}) {
    return (
        <DateField inline required label={t(label)} value={value} min={min} onChange={onChange} />
    );
}

/** 「逢 ⟨星期⟩」；舊規則每 N 日（唔係 1 / 7）就照寫「每 N 日」 */
function EveryField({
    start,
    every,
    label,
    onChange,
}: {
    start: string;
    every: Every;
    label: MessageKey;
    onChange: (every: Every) => void;
}) {
    const weekdays = weekdaysOf({ start, every });
    if (!weekdays)
        return <>{t('schedule.everyDays', { days: 'days' in every ? every.days : 0 })}</>;
    return (
        <>
            {t('schedule.every')}
            <DaysField
                inline
                label={t(label)}
                days={weekdays}
                onChange={(picked: Weekday[]) => onChange({ weekdays: picked })}
            />
        </>
    );
}

/**
 * 「由 ⟨日期⟩ 起，逢 ⟨星期⟩，每次上架 / 下架 ⟨N⟩ 集」：分兩段（各自唔斷行），一行放得落就一行；
 * 放唔落就第二行由「逢」開頭，唔會「逢」吊喺第一行尾（用戶 2026-11-12）。第二段比 panel 仲闊先喺入面斷
 */
export function CadenceSentence<T extends Periodic>({
    form,
    labels,
    min,
    onChange,
}: {
    form: T;
    labels: CadenceLabels;
    min?: string | undefined;
    onChange: (form: T) => void;
}) {
    return (
        <div className="sentence cadence">
            <span className="cadence-part">
                {t('schedule.from')}{' '}
                <SentenceDate
                    label={labels.start}
                    value={form.start}
                    min={min}
                    onChange={(start) => onChange({ ...form, start })}
                />{' '}
                {t('schedule.since')}
            </span>
            <span className="cadence-part">
                <EveryField
                    start={form.start}
                    every={form.every}
                    label={labels.weekdays}
                    onChange={(every) => onChange({ ...form, every })}
                />
                {t(labels.each)}{' '}
                <input
                    className="inline-ctl"
                    type="number"
                    min={1}
                    max={MAX_PER_RELEASE}
                    aria-label={t(labels.perRelease)}
                    value={form.perRelease}
                    onChange={(e) =>
                        onChange({ ...form, perRelease: positive(e.target.value, MAX_PER_RELEASE) })
                    }
                />{' '}
                {t('schedule.unit')}
            </span>
        </div>
    );
}
