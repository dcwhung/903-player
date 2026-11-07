/*
 * 香港日曆日子（YYYY-MM-DD）嘅純函數：catalog（上架 / 下架、schema 驗證）同 player 共用。
 * 顯示用嘅格式化（i18n）同 HHMM 時間留喺 player 嘅 utils/date.ts
 */
import { HK_TIMEZONE } from './constants';
import type { Weekday } from './types/weekday';

// en-CA 嘅日期格式正好係 YYYY-MM-DD
const hkDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: HK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

export const hkToday = (now: Date = new Date()): string => hkDateFormatter.format(now);

const MS_PER_DAY = 24 * 60 * 60 * 1_000;

/** YYYY-MM-DD 拆成 [年, 月, 日] */
export const splitIsoDate = (isoDate: string): [number, number, number] =>
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

/** 香港固定 UTC+8（冇夏令時間） */
const HK_UTC_OFFSET_MS = 8 * 60 * 60 * 1_000;

/** 由 now 計到下一個香港午夜仲有幾多 ms（S-704：午夜 timer 用） */
export const msUntilNextHkMidnight = (now: Date = new Date()): number =>
    isoDateToUtcMs(addDays(hkToday(now), 1)) - HK_UTC_OFFSET_MS - now.getTime();
