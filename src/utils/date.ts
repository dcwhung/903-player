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

const DATE_PART_WIDTH = 2;

const dateParts = (isoDate: string) => {
    const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number];
    return {
        day: String(day).padStart(DATE_PART_WIDTH, '0'),
        month: String(month).padStart(DATE_PART_WIDTH, '0'),
        weekday: WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? '',
    };
};

/** 17/10（六） */
export const formatDateLabel = (isoDate: string): string => t('dates.label', dateParts(isoDate));

/** 17/10 */
export const formatDayMonth = (isoDate: string): string => t('dates.dayMonth', dateParts(isoDate));

/** 星期六 */
export const formatWeekday = (isoDate: string): string => t('dates.weekday', dateParts(isoDate));
