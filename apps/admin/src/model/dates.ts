/* 日子顯示（香港時間）：一律日/月（用戶 2026-11-11）：「16/11 一」、「11 月 16 日」、「09:41」；有年份 = 日/月/年 */
import { HK_TIMEZONE, hkToday, weekdayOf } from '@903-player/catalog';
import { t } from '../i18n/t';
import { isoPartsOf } from './isoDate';

const WEEKDAYS = t('weekdays.short').split(',');
/** YYYY-MM-DD 頭 4 個字 = 年 */
const ISO_YEAR_LENGTH = 4;

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: HK_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

const partsOf = (isoDate: string) => ({ ...isoPartsOf(isoDate), weekday: weekdayOf(isoDate) });

const yearOf = (isoDate: string) => isoDate.slice(0, ISO_YEAR_LENGTH);

/** YYYY-MM-DD → 「16/11 一」；唔係今年（香港時間）就加年份「3/1/2027 日」（S-830，同 stampOf 一樣） */
export const shortDate = (isoDate: string, today: string = hkToday()): string => {
    const { year, month, day, weekday } = partsOf(isoDate);
    const name = WEEKDAYS[weekday] ?? '';
    return yearOf(isoDate) === yearOf(today)
        ? t('dates.short', { month, day, weekday: name })
        : t('dates.shortYear', { year, month, day, weekday: name });
};

/** YYYY-MM-DD → 「16/11」（冇星期；排程時間軸 / tooltip 用） */
export const dayMonth = (isoDate: string): string => {
    const { month, day } = partsOf(isoDate);
    return t('dates.dayMonth', { day, month });
};

/** YYYY-MM-DD → 「11 月 16 日」 */
export const longDate = (isoDate: string): string => {
    const { month, day } = partsOf(isoDate);
    return t('dates.long', { month, day });
};

/** YYYY-MM-DD → 「11 月 16 日」；唔係今年（香港時間）就加年份「2027 年 1 月 3 日」 */
export const fullDate = (isoDate: string, today: string = hkToday()): string => {
    const { year, month, day } = partsOf(isoDate);
    return yearOf(isoDate) === yearOf(today)
        ? t('dates.long', { month, day })
        : t('dates.longYear', { year, month, day });
};

/** YYYY-MM-DD → 星期幾嘅單字（「一」） */
export const weekdayName = (isoDate: string): string => WEEKDAYS[weekdayOf(isoDate)] ?? '';

/** ISO timestamp → 香港時間「09:41」 */
export const clockTime = (iso: string): string => timeFormatter.format(new Date(iso));

/** 記錄用：今日 →「今日 10:02」，今年其他日子 →「9/11 22:40」，第二年 →「31/12/2025 22:40」 */
export const stampOf = (iso: string, now: Date = new Date()): string => {
    const date = hkToday(new Date(iso));
    const today = hkToday(now);
    if (date === today) return t('dates.today', { time: clockTime(iso) });
    const { year, month, day } = partsOf(date);
    const sameYear = yearOf(date) === yearOf(today);
    const label = sameYear
        ? t('dates.dayMonth', { day, month })
        : t('dates.dayMonthYear', { day, month, year });
    return `${label} ${clockTime(iso)}`;
};
