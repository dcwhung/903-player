import { HK_TIMEZONE } from '../config/constants';
import { t } from '../i18n/t';
import { WEEKDAYS } from '../i18n/zh-HK';
import type { Weekday } from '../types/weekday';

// en-CA 嘅日期格式正好係 YYYY-MM-DD
const hkDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: HK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

export const hkToday = (now: Date = new Date()): string => hkDateFormatter.format(now);

// h23 確保午夜係 00 而唔係 24
const hkTimeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: HK_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

const TIME_PART_TYPES: ReadonlySet<string> = new Set(['hour', 'minute']);

/** 香港時間 HHMM（例如 0905），同錄音檔名入面嘅時間格式一樣 */
export const hkTimeHHMM = (now: Date = new Date()): string =>
    hkTimeFormatter
        .formatToParts(now)
        .filter((part) => TIME_PART_TYPES.has(part.type))
        .map((part) => part.value)
        .join('');

const DATE_PART_WIDTH = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1_000;

const splitIsoDate = (isoDate: string): [number, number, number] =>
    isoDate.split('-').map(Number) as [number, number, number];

/** YYYY-MM-DD 當作 UTC 午夜，唔受裝置時區影響 */
const isoDateToUtcMs = (isoDate: string): number => {
    const [year, month, day] = splitIsoDate(isoDate);
    return Date.UTC(year, month - 1, day);
};

/** 星期幾：0 = 星期日 … 6 = 星期六（同 Date#getUTCDay 一致） */
export const weekdayOf = (isoDate: string): Weekday =>
    // getUTCDay 一定係 0–6，TypeScript 唔識收窄，所以要 cast
    new Date(isoDateToUtcMs(isoDate)).getUTCDay() as Weekday;

/** 兩個 YYYY-MM-DD 之間相差幾多日（to − from） */
export const daysBetween = (from: string, to: string): number =>
    Math.round((isoDateToUtcMs(to) - isoDateToUtcMs(from)) / MS_PER_DAY);

/** toISOString() 頭 10 個字就係 YYYY-MM-DD */
const ISO_DATE_LENGTH = 10;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 格式啱之外，仲要係真實存在嘅日子（排除 2026-13-99 之類） */
export const isCalendarDate = (value: string): boolean => {
    const match = ISO_DATE_PATTERN.exec(value);
    if (!match) {
        return false;
    }
    const [, year, month, day] = match.map(Number) as [number, number, number, number];
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toISOString().slice(0, ISO_DATE_LENGTH) === value;
};

/** YYYY-MM-DD 加減幾多日（跨月 / 跨年都得） */
export const addDays = (isoDate: string, days: number): string =>
    new Date(isoDateToUtcMs(isoDate) + days * MS_PER_DAY).toISOString().slice(0, ISO_DATE_LENGTH);

const dateParts = (isoDate: string) => {
    const [, month, day] = splitIsoDate(isoDate);
    return {
        day: String(day).padStart(DATE_PART_WIDTH, '0'),
        month: String(month).padStart(DATE_PART_WIDTH, '0'),
        weekday: WEEKDAYS[weekdayOf(isoDate)] ?? '',
    };
};

/** 17/10（六） */
export const formatDateLabel = (isoDate: string): string => t('dates.label', dateParts(isoDate));

/** 17/10 */
export const formatDayMonth = (isoDate: string): string => t('dates.dayMonth', dateParts(isoDate));

/** 星期六 */
export const formatWeekday = (isoDate: string): string => t('dates.weekday', dateParts(isoDate));
