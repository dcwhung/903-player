/*
 * 一句話規則（mockup ⑩ A）：由 [日期] 起，逢 [星期]，每次上 [N 集]，[下架安排]
 */
import type { Weekday } from '@903-player/catalog';
import { t } from '../../i18n/t';
import { DaysField } from '../shows/DaysField';
import { weekdaysOf, type ScheduleForm } from './scheduleModel';

const REMOVAL_DAYS = [7, 14, 30, 60, 90];
const MAX_PER_RELEASE = 99;

type Editable = Exclude<ScheduleForm, { mode: 'custom' }>;

function RemovalSelect({
    form,
    onChange,
}: {
    form: Editable;
    onChange: (form: ScheduleForm) => void;
}) {
    return (
        <select
            className="inline-ctl"
            aria-label={t('schedule.removeLabel')}
            value={form.removeAfterDays ?? ''}
            onChange={(e) =>
                onChange({
                    ...form,
                    removeAfterDays: e.target.value === '' ? null : Number(e.target.value),
                })
            }
        >
            <option value="">{t('schedule.keep')}</option>
            {REMOVAL_DAYS.map((days) => (
                <option key={days} value={days}>
                    {t('schedule.removeAfter', { days })}
                </option>
            ))}
        </select>
    );
}

function Cadence({
    form,
    onChange,
}: {
    form: Extract<ScheduleForm, { mode: 'periodic' }>;
    onChange: (form: ScheduleForm) => void;
}) {
    const weekdays = weekdaysOf(form);
    const every = 'days' in form.every ? form.every.days : 0;
    return (
        <>
            {weekdays ? (
                <>
                    {t('schedule.every')}
                    <DaysField
                        inline
                        label={t('schedule.weekdaysLabel')}
                        days={weekdays}
                        onChange={(days: Weekday[]) =>
                            onChange({ ...form, every: { weekdays: days } })
                        }
                    />
                </>
            ) : (
                t('schedule.everyDays', { days: every })
            )}
            {t('schedule.each')}
            <input
                className="inline-ctl"
                type="number"
                min={1}
                max={MAX_PER_RELEASE}
                aria-label={t('schedule.perRelease')}
                value={form.perRelease}
                onChange={(e) =>
                    onChange({ ...form, perRelease: Math.max(1, Number(e.target.value) || 1) })
                }
            />
            {t('schedule.unit')}，
        </>
    );
}

export function ScheduleSentence({
    form,
    onChange,
}: {
    form: ScheduleForm;
    onChange: (form: ScheduleForm) => void;
}) {
    if (form.mode === 'custom')
        return (
            <p className="sentence">
                {t('schedule.customSentence', {
                    count: form.rule.kind === 'dates' ? form.rule.batches.length : 1,
                })}
            </p>
        );
    return (
        <p className="sentence">
            {t('schedule.from')}{' '}
            <input
                className="inline-ctl"
                type="date"
                aria-label={t('schedule.startLabel')}
                value={form.start}
                onChange={(e) => e.target.value && onChange({ ...form, start: e.target.value })}
            />{' '}
            {t('schedule.since')}
            {form.mode === 'periodic' ? (
                <Cadence form={form} onChange={onChange} />
            ) : (
                `${t('schedule.allAtOnce')}，`
            )}
            <RemovalSelect form={form} onChange={onChange} />
        </p>
    );
}
