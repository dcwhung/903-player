import { HK_TIMEZONE } from '../config/constants';
import { t } from '../i18n/t';
import { WEEKDAYS } from '../i18n/zh-HK';

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
export const isoWeekday = (isoDate: string): number =>
    new Date(isoDateToUtcMs(isoDate)).getUTCDay();

/** 兩個 YYYY-MM-DD 之間相差幾多日（to − from） */
export const daysBetween = (from: string, to: string): number =>
    Math.round((isoDateToUtcMs(to) - isoDateToUtcMs(from)) / MS_PER_DAY);

const dateParts = (isoDate: string) => {
    const [, month, day] = splitIsoDate(isoDate);
    return {
        day: String(day).padStart(DATE_PART_WIDTH, '0'),
        month: String(month).padStart(DATE_PART_WIDTH, '0'),
        weekday: WEEKDAYS[isoWeekday(isoDate)] ?? '',
    };
};

/** 17/10（六） */
export const formatDateLabel = (isoDate: string): string => t('dates.label', dateParts(isoDate));

/** 17/10 */
export const formatDayMonth = (isoDate: string): string => t('dates.dayMonth', dateParts(isoDate));

/** 星期六 */
export const formatWeekday = (isoDate: string): string => t('dates.weekday', dateParts(isoDate));
