import { ALLOWED_AUDIO_ORIGIN } from '../config/constants';
import { SHOWS } from '../config/shows';
import type { Recording } from '../types/recording';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3])[0-5]\d$/;
const ISO_DATE_LENGTH = 10;
const SHOW_IDS = new Set<string>(SHOWS.map((show) => show.id));

/** 只接受原站 audio host，防止 feed 被注入其他網址 */
export const hasAllowedAudioOrigin = (url: string): boolean => {
    try {
        return new URL(url).origin === ALLOWED_AUDIO_ORIGIN;
    } catch {
        return false;
    }
};

/** 格式啱之外，仲要係真實存在嘅日子（排除 2026-13-99 之類） */
const isCalendarDate = (value: string): boolean => {
    const match = DATE_PATTERN.exec(value);
    if (!match) {
        return false;
    }
    const [, year, month, day] = match.map(Number) as [number, number, number, number];
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toISOString().slice(0, ISO_DATE_LENGTH) === value;
};

/** 驗證外部資料（feed JSON）係咪合法錄音 */
export const isRecording = (value: unknown): value is Recording => {
    const r = value as Recording;
    return (
        typeof r === 'object' &&
        r !== null &&
        SHOW_IDS.has(r.showId) &&
        typeof r.date === 'string' &&
        isCalendarDate(r.date) &&
        typeof r.time === 'string' &&
        TIME_PATTERN.test(r.time) &&
        typeof r.url === 'string' &&
        hasAllowedAudioOrigin(r.url)
    );
};

/** 同一個 URL 只保留第一個（原站偶然會重複列出） */
export const uniqueByUrl = (recordings: Recording[]): Recording[] => {
    const seen = new Set<string>();
    return recordings.filter((r) => !seen.has(r.url) && Boolean(seen.add(r.url)));
};
