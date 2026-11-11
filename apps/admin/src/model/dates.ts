/* 日子顯示（香港時間）：「11/16 一」、「11 月 16 日」、「09:41」 */
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
    return { month, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
};

/** YYYY-MM-DD → 「11/16 一」 */
export const shortDate = (isoDate: string): string => {
    const { month, day, weekday } = partsOf(isoDate);
    return t('dates.short', { month, day, weekday: WEEKDAYS[weekday] ?? '' });
};

/** YYYY-MM-DD → 「11 月 16 日」 */
export const longDate = (isoDate: string): string => {
    const { month, day } = partsOf(isoDate);
    return t('dates.long', { month, day });
};

/** ISO timestamp → 香港時間「09:41」 */
export const clockTime = (iso: string): string => timeFormatter.format(new Date(iso));

/** 記錄用：今日 →「今天 10:02」，其他日子 →「11/9 22:40」 */
export const stampOf = (iso: string, now: Date = new Date()): string => {
    const day = hkToday(new Date(iso));
    if (day === hkToday(now)) return t('dates.today', { time: clockTime(iso) });
    const { month, day: dayOfMonth } = partsOf(day);
    return `${month}/${dayOfMonth} ${clockTime(iso)}`;
};
