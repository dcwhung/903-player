import { isCalendarDate } from '@903-player/catalog';
import { ALLOWED_AUDIO_ORIGIN } from '../config/constants';
import { findShow } from '../catalog/shows';
import type { Recording } from '../types/recording';

const TIME_PATTERN = /^([01]\d|2[0-3])[0-5]\d$/;

/**
 * 節目 id 要喺 catalog 入面：每次問 registry（唔好喺 module 載入時計 Set，registry 要等 initCatalog 揀定 source）。
 * 非字串（例如舊 storage 壞資料）一律唔收
 */
const isKnownShowId = (id: unknown): boolean =>
    typeof id === 'string' && findShow(id) !== undefined;

/** 只接受原站 audio host，防止 storage 被注入其他網址 */
export const hasAllowedAudioOrigin = (url: string): boolean => {
    try {
        return new URL(url).origin === ALLOWED_AUDIO_ORIGIN;
    } catch {
        return false;
    }
};

/** localStorage 存低嘅錄音：v1.29 之前冇 id（讀嗰陣由 showId + date 補，見 probeStore） */
export type StoredRecording = Omit<Recording, 'id'>;

/** 驗證外部資料（localStorage 讀返嘅 JSON）係咪合法錄音（唔睇 id：一律由 showId + date 重新計） */
export const isRecording = (value: unknown): value is StoredRecording => {
    const r = value as StoredRecording;
    return (
        typeof r === 'object' &&
        r !== null &&
        isKnownShowId(r.showId) &&
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
