import { isRecording } from '../data/recordingValidation';
import type { Recording } from '../types/recording';

export const PROBE_STORAGE_KEY = '903player:probed:v1';

export interface ProbeState {
    /** app 自己搵到嘅錄音：錄音列表嘅唯一來源（SSOT） */
    found: Recording[];
    /** `${showId}:${date}` → 上次搵唔到嘅時間（ms），用嚟限制重試頻率 */
    misses: Record<string, number>;
}

/** misses 嘅 key 格式：`showId:date`（showId 同日期都唔會有 `:`） */
const SHOW_DATE_KEY_SEPARATOR = ':';

export const showDateKey = (showId: string, date: string): string =>
    `${showId}${SHOW_DATE_KEY_SEPARATOR}${date}`;

/** 由 key 攞返節目 id */
export const showIdFromShowDateKey = (key: string): string =>
    key.split(SHOW_DATE_KEY_SEPARATOR)[0] ?? '';

/** 由 key 攞返日期；格式唔啱就回傳空字串 */
export const dateFromShowDateKey = (key: string): string =>
    key.split(SHOW_DATE_KEY_SEPARATOR)[1] ?? '';

/** 每次都整個新 object，避免 caller 改咗共用嘅預設值 */
const emptyState = (): ProbeState => ({ found: [], misses: {} });

const readMisses = (value: unknown): Record<string, number> =>
    typeof value === 'object' && value !== null
        ? Object.fromEntries(Object.entries(value).filter(([, time]) => typeof time === 'number'))
        : {};

export const readProbeState = (): ProbeState => {
    try {
        const parsed = JSON.parse(localStorage.getItem(PROBE_STORAGE_KEY) ?? 'null') as {
            found?: unknown;
            misses?: unknown;
        } | null;
        if (typeof parsed !== 'object' || parsed === null) {
            return emptyState();
        }
        return {
            found: Array.isArray(parsed.found) ? parsed.found.filter(isRecording) : [],
            misses: readMisses(parsed.misses),
        };
    } catch {
        return emptyState();
    }
};

export const writeProbeState = (state: ProbeState): void => {
    try {
        localStorage.setItem(PROBE_STORAGE_KEY, JSON.stringify(state));
    } catch {
        // 私人瀏覽 / 空間不足：下次再 probe 就得，唔影響今次結果
    }
};
