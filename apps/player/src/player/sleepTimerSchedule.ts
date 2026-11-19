import {
    MS_PER_SECOND,
    NIGHT_END_HOUR,
    NIGHT_START_HOUR,
    SECONDS_PER_MINUTE,
    SLEEP_TIMER_SCHEDULE_ROUND_MINUTES,
    SLEEP_TIMER_SCHEDULE_WINDOW_HOURS,
} from '../config/constants';
import { isSleepTimerOption, type SleepTimerOption } from './sleepTimer';

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const MINUTE_MS = SECONDS_PER_MINUTE * MS_PER_SECOND;

/** 排程時間之後幾耐內有效（再同 05:00 比，以早到者為準） */
export const SCHEDULE_WINDOW_MS = SLEEP_TIMER_SCHEDULE_WINDOW_HOURS * MINUTES_PER_HOUR * MINUTE_MS;

/**
 * 每晚自動（用戶 2026-11-19）：手動揀選項嗰刻嘅本地時間（四捨五入到 5 分鐘）+ 選項，無限重複。
 * firedFor = 已經觸發咗（或者當觸發咗）嗰晚嘅排程時刻，每晚最多一次
 */
export interface SleepTimerSchedule {
    /** 本地時間由午夜起計幾多分鐘（0–1439） */
    minuteOfDay: number;
    option: SleepTimerOption;
    firedFor: number | null;
}

/** 而家嘅本地時間（秒唔計）四捨五入到最近 5 分鐘：23:12 → 23:10、23:13 → 23:15；23:58 → 第二日 00:00 */
export const roundScheduleInstant = (now: number): number => {
    const date = new Date(now);
    const minutes = date.getHours() * MINUTES_PER_HOUR + date.getMinutes();
    const rounded =
        Math.round(minutes / SLEEP_TIMER_SCHEDULE_ROUND_MINUTES) *
        SLEEP_TIMER_SCHEDULE_ROUND_MINUTES;
    // setHours 處理 24:00 → 第二日 00:00
    return date.setHours(0, rounded, 0, 0);
};

/** 某個時刻係本地時間嘅第幾分鐘 */
export const minuteOfDay = (instant: number): number => {
    const date = new Date(instant);
    return date.getHours() * MINUTES_PER_HOUR + date.getMinutes();
};

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * 排程時間係唔係夜間時段（本地 21:00–05:00，同月亮掣一樣）：日間時間唔記、唔觸發，日間版面 / 播放零改變（W-820）
 */
export const isNightSchedule = (minutes: number): boolean =>
    minutes >= NIGHT_START_HOUR * MINUTES_PER_HOUR || minutes < NIGHT_END_HOUR * MINUTES_PER_HOUR;

/** 22:30 */
export const formatScheduleTime = (minutes: number): string =>
    `${pad(Math.floor(minutes / MINUTES_PER_HOUR))}:${pad(minutes % MINUTES_PER_HOUR)}`;

/** 某日（本地）嘅某分鐘；dayOffset -1 = 前一日 */
const onDay = (now: number, minutes: number, dayOffset: number): number => {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    return date.setHours(0, minutes, 0, 0);
};

/** start 之後第一個 05:00（start 啱啱 05:00 就係第二日） */
const nextNightEnd = (start: number): number => {
    const end = new Date(start);
    end.setHours(NIGHT_END_HOUR, 0, 0, 0);
    if (end.getTime() <= start) end.setDate(end.getDate() + 1);
    return end.getTime();
};

/**
 * 而家喺邊晚嘅有效時段入面：排程時刻起 3 個鐘內、同埋 05:00 之前（以早到者為準），跨午夜都得。
 * 冇就 null（未到 / 過咗 / 日間時間嘅舊排程）
 */
export const occurrenceAt = (
    minutes: number,
    now: number,
): { start: number; end: number } | null => {
    if (!isNightSchedule(minutes)) return null;
    const today = onDay(now, minutes, 0);
    const start = today <= now ? today : onDay(now, minutes, -1);
    const end = Math.min(start + SCHEDULE_WINDOW_MS, nextNightEnd(start));
    return now < end ? { start, end } : null;
};

const isMinuteOfDay = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= 0 && (value as number) < MINUTES_PER_DAY;

/** 舊版 / 手改過嘅資料唔信：唔合格就當冇排程 */
export const toSchedule = (value: unknown): SleepTimerSchedule | null => {
    if (typeof value !== 'object' || value === null) return null;
    const { minuteOfDay: minutes, option, firedFor } = value as Record<string, unknown>;
    if (!isMinuteOfDay(minutes) || !isSleepTimerOption(option)) return null;
    const fired = typeof firedFor === 'number' && Number.isFinite(firedFor) ? firedFor : null;
    return { minuteOfDay: minutes, option, firedFor: fired };
};
