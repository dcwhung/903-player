/*
 * 即將上架 / 快將下架嘅日子字（F3，_mockups_/coming-soon ③）：兩日內講「明日 / 後日」，遠就寫日子。
 * 短版（chip、主頁格）用 dates.dayMonth；長版（一覽表、清單、讀屏）用 dates.label（加星期）。
 * 字眼全部喺 i18n availability.*
 */
import { t, type MessageKey } from '../i18n/t';
import { daysBetween, formatDateLabel, formatDayMonth } from '../utils/date';

export type WhenLength = 'short' | 'long';

const TOMORROW = 1;
const DAY_AFTER = 2;

interface VerbKeys {
    short: MessageKey;
    long: MessageKey;
    tomorrow: MessageKey;
    dayAfter: MessageKey;
}

const RELEASE: VerbKeys = {
    short: 'availability.releaseShort',
    long: 'availability.releaseLong',
    tomorrow: 'availability.releaseTomorrow',
    dayAfter: 'availability.releaseDayAfter',
};

const REMOVAL: VerbKeys = {
    short: 'availability.removalShort',
    long: 'availability.removalLong',
    tomorrow: 'availability.removalTomorrow',
    dayAfter: 'availability.removalDayAfter',
};

const when = (keys: VerbKeys, date: string, today: string, length: WhenLength): string => {
    const days = daysBetween(today, date);
    if (days === TOMORROW) return t(keys.tomorrow);
    if (days === DAY_AFTER) return t(keys.dayAfter);
    return length === 'short'
        ? t(keys.short, { date: formatDayMonth(date) })
        : t(keys.long, { date: formatDateLabel(date) });
};

/** 「12/11 上架」/「12/11（四）上架」/「明日上架」 */
export const releaseWhen = (date: string, today: string, length: WhenLength): string =>
    when(RELEASE, date, today, length);

/** 「05/12 下架」/「05/12（六）下架」/「後日下架」 */
export const removalWhen = (date: string, today: string, length: WhenLength): string =>
    when(REMOVAL, date, today, length);

/** 讀屏用：一律長版日子（唔講明日 / 後日，讀出嚟清楚啲） */
export const releaseDateLong = (date: string): string =>
    t('availability.releaseLong', { date: formatDateLabel(date) });

export const removalDateLong = (date: string): string =>
    t('availability.removalLong', { date: formatDateLabel(date) });

/** 冇動詞嘅短版：「01/12」/「明日」/「後日」 */
export const dayWhen = (date: string, today: string): string => {
    const days = daysBetween(today, date);
    if (days === TOMORROW) return t('availability.tomorrow');
    if (days === DAY_AFTER) return t('availability.dayAfter');
    return formatDayMonth(date);
};
