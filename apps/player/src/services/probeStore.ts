import { showEpisodeId } from '@903-player/catalog';
import { isCatalogComplete } from '../catalog/runtime';
import {
    isRecording,
    isUnknownShowRecording,
    type StoredRecording,
} from '../data/recordingValidation';
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

/** episode ID 一律由 showId + date 計：舊 cache（v1.29 之前）冇 id 都照用得，唔使重新 probe */
const withEpisodeId = (r: StoredRecording): Recording => ({
    ...r,
    id: showEpisodeId(r.showId, r.date),
});

const readFound = (value: unknown): Recording[] =>
    Array.isArray(value) ? value.filter(isRecording).map(withEpisodeId) : [];

interface StoredProbeState {
    found?: unknown;
    misses?: unknown;
}

/** storage 入面嘅原始 JSON；冇 / 唔係 object 就 null，壞 JSON 會 throw */
const parseStored = (): StoredProbeState | null => {
    const parsed: unknown = JSON.parse(localStorage.getItem(PROBE_STORAGE_KEY) ?? 'null');
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
};

/** 只抄已驗證嘅欄位，storage 入面多出嚟嘅嘢唔跟住寫返落去 */
const toStoredRecording = ({ showId, date, time, url }: StoredRecording): StoredRecording => ({
    showId,
    date,
    time,
    url,
});

/**
 * storage 入面今次 catalog 唔識嘅節目嘅錄音（格式照驗）。readProbeState 唔會交出嚟，
 * 所以唔會去到 UI / 播放器；只係 writeProbeState 寫返落去用
 */
const readUnknownShowFound = (): StoredRecording[] => {
    try {
        const found = parseStored()?.found;
        return Array.isArray(found)
            ? found.filter(isUnknownShowRecording).map(toStoredRecording)
            : [];
    } catch {
        return [];
    }
};

export const readProbeState = (): ProbeState => {
    try {
        const parsed = parseStored();
        if (parsed === null) {
            return emptyState();
        }
        return {
            found: readFound(parsed.found),
            misses: readMisses(parsed.misses),
        };
    } catch {
        return emptyState();
    }
};

/**
 * state.found 只有今次 catalog 識嘅節目（readProbeState 篩過）。catalog 唔齊（攞唔到 catalog.json、
 * 退咗去內建資料）時，唔識嘅節目可能只係今次睇唔到，佢哋喺 storage 嘅錄音要照留：過咗回看期嘅再 probe 都攞唔返（AU-027）。
 * catalog 齊全時唔識 = 真係刪咗，照舊清走，storage 唔會越積越多
 */
export const writeProbeState = (state: ProbeState): void => {
    try {
        const found = isCatalogComplete()
            ? state.found
            : [...state.found, ...readUnknownShowFound()];
        localStorage.setItem(PROBE_STORAGE_KEY, JSON.stringify({ ...state, found }));
    } catch {
        // 私人瀏覽 / 空間不足：下次再 probe 就得，唔影響今次結果
    }
};
