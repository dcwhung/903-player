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

export const formatDateLabel = (isoDate: string): string => {
    const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number];
    const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? '';
    return t('dates.label', {
        day: String(day).padStart(2, '0'),
        month: String(month).padStart(2, '0'),
        weekday,
    });
};
