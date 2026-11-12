/* 日子顯示（香港時間）：一律日/月（用戶 2026-11-11）：「16/11 一」、「11 月 16 日」、「09:41」；有年份 = 日/月/年 */
import { HK_TIMEZONE, hkToday } from '@903-player/catalog';
import { t } from '../i18n/t';

const WEEKDAYS = t('weekdays.short').split(',');

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: HK_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

const partsOf = (isoDate: string) => {
    const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
    return { year, month, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
};

/** YYYY-MM-DD → 「16/11 一」 */
export const shortDate = (isoDate: string): string => {
    const { month, day, weekday } = partsOf(isoDate);
    return t('dates.short', { month, day, weekday: WEEKDAYS[weekday] ?? '' });
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

/** ISO timestamp → 香港時間「09:41」 */
export const clockTime = (iso: string): string => timeFormatter.format(new Date(iso));

/** 記錄用：今日 →「今天 10:02」，今年其他日子 →「9/11 22:40」，第二年 →「31/12/2025 22:40」 */
export const stampOf = (iso: string, now: Date = new Date()): string => {
    const date = hkToday(new Date(iso));
    const today = hkToday(now);
    if (date === today) return t('dates.today', { time: clockTime(iso) });
    const { year, month, day } = partsOf(date);
    const sameYear = date.slice(0, 4) === today.slice(0, 4);
    const label = sameYear
        ? t('dates.dayMonth', { day, month })
        : t('dates.dayMonthYear', { day, month, year });
    return `${label} ${clockTime(iso)}`;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** admin 本機嘅今日（YYYY-MM-DD）：時間軸「今日」、日曆標今日用（用戶 2026-11-12） */
export const localToday = (now: Date = new Date()): string =>
    `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
