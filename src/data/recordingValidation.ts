import { ALLOWED_AUDIO_ORIGIN } from '../config/constants';
import { SHOWS } from '../config/shows';
import type { Recording } from '../types/recording';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{4}$/;
const SHOW_IDS = new Set<string>(SHOWS.map((show) => show.id));

/** 只接受原站 audio host，防止 feed 被注入其他網址 */
export const hasAllowedAudioOrigin = (url: string): boolean => {
    try {
        return new URL(url).origin === ALLOWED_AUDIO_ORIGIN;
    } catch {
        return false;
    }
};

/** 驗證外部資料（feed JSON）係咪合法錄音 */
export const isRecording = (value: unknown): value is Recording => {
    const r = value as Recording;
    return (
        typeof r === 'object' &&
        r !== null &&
        SHOW_IDS.has(r.showId) &&
        DATE_PATTERN.test(r.date) &&
        TIME_PATTERN.test(r.time) &&
        typeof r.url === 'string' &&
        hasAllowedAudioOrigin(r.url)
    );
};
