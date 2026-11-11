/*
 * 排程（mockup ⑩ A + C）：一句話規則 ↔ ScheduleRule、預設 chip、排法描述、短篇 tab 細字
 */
import type { ScheduleRule, Weekday } from '@903-player/catalog';
import { t } from '../../i18n/t';

const DAYS_PER_WEEK = 7;
const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAY_NAMES = t('weekdays.short').split(',');

export type Every = { days: number } | { weekdays: Weekday[] };

export type ScheduleForm =
    | { mode: 'all'; start: string; removeAfterDays: number | null }
    | {
          mode: 'periodic';
          start: string;
          every: Every;
          perRelease: number;
          removeAfterDays: number | null;
      }
    /** 自訂多批（API 直接寫嘅 dates 規則）：句子唔改得，揀預設就換走 */
    | { mode: 'custom'; rule: ScheduleRule };

export const weekdayOf = (isoDate: string): Weekday => {
    const [y = 0, m = 1, d = 1] = isoDate.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday;
};

const removal = (rule: ScheduleRule) => rule.removeAfterDays ?? null;

export const formOf = (rule: ScheduleRule | null, today: string): ScheduleForm => {
    if (!rule) return { mode: 'all', start: today, removeAfterDays: null };
    if (rule.kind === 'periodic')
        return {
            mode: 'periodic',
            start: rule.start,
            every: rule.every,
            perRelease: rule.perRelease,
            removeAfterDays: removal(rule),
        };
    const [first] = rule.batches;
    if (rule.batches.length === 1 && first)
        return { mode: 'all', start: first.date, removeAfterDays: removal(rule) };
    return { mode: 'custom', rule };
};

const withRemoval = (rule: ScheduleRule, days: number | null): ScheduleRule =>
    days === null ? rule : { ...rule, removeAfterDays: days };

export const ruleOf = (form: ScheduleForm, firstNo: number): ScheduleRule => {
    if (form.mode === 'custom') return form.rule;
    if (form.mode === 'all')
        return withRemoval(
            { kind: 'dates', batches: [{ from: firstNo, date: form.start }] },
            form.removeAfterDays,
        );
    const every =
        'weekdays' in form.every && form.every.weekdays.length === DAYS_PER_WEEK
            ? { days: 1 }
            : form.every;
    return withRemoval(
        { kind: 'periodic', start: form.start, perRelease: form.perRelease, every },
        form.removeAfterDays,
    );
};

/** 句子入面揀咗嘅星期（每日 = 全部；每 7 日 = 開始嗰日） */
export const weekdaysOf = (form: ScheduleForm): Weekday[] | null => {
    if (form.mode !== 'periodic') return null;
    if ('weekdays' in form.every) return form.every.weekdays;
    if (form.every.days === 1) return ALL_WEEKDAYS;
    return form.every.days === DAYS_PER_WEEK ? [weekdayOf(form.start)] : null;
};

export type PresetKey = 'all' | 'daily' | 'mwf' | 'weekly';
export const PRESET_KEYS: readonly PresetKey[] = ['all', 'daily', 'mwf', 'weekly'];

export const applyPreset = (key: PresetKey, start: string): ScheduleForm => {
    const periodic = (every: Every, perRelease: number): ScheduleForm => ({
        mode: 'periodic',
        start,
        every,
        perRelease,
        removeAfterDays: null,
    });
    if (key === 'all') return { mode: 'all', start, removeAfterDays: null };
    if (key === 'daily') return periodic({ days: 1 }, 1);
    if (key === 'mwf') return periodic({ weekdays: [1, 3, 5] }, 5);
    return periodic({ weekdays: [weekdayOf(start)] }, 1);
};

export const presetOf = (form: ScheduleForm): PresetKey | undefined =>
    PRESET_KEYS.find(
        (key) =>
            form.mode !== 'custom' &&
            JSON.stringify(applyPreset(key, form.start)) === JSON.stringify(form),
    );

/** 批次表「排法」：「逢三、五 · 每次 5 集」 */
export const describeRule = (rule: ScheduleRule): string => {
    if (rule.kind === 'dates')
        return rule.batches.length === 1 ? t('schedule.allAtOnce') : t('schedule.custom');
    const each = t('schedule.patternEach', { count: rule.perRelease });
    if ('weekdays' in rule.every)
        return `${t('schedule.every')}${rule.every.weekdays.map((d) => WEEKDAY_NAMES[d]).join('、')} · ${each}`;
    return `${t('schedule.everyDays', { days: rule.every.days })} · ${each}`;
};
