import { ALLOWED_AUDIO_ORIGIN } from '../config/constants';
import { SHOWS } from '../config/shows';
import type { Recording } from '../types/recording';
import { isCalendarDate } from '../utils/date';

const TIME_PATTERN = /^([01]\d|2[0-3])[0-5]\d$/;
const SHOW_IDS = new Set<string>(SHOWS.map((show) => show.id));

/** 只接受原站 audio host，防止 storage 被注入其他網址 */
export const hasAllowedAudioOrigin = (url: string): boolean => {
    try {
        return new URL(url).origin === ALLOWED_AUDIO_ORIGIN;
    } catch {
        return false;
    }
};

/** 驗證外部資料（localStorage 讀返嘅 JSON）係咪合法錄音 */
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
