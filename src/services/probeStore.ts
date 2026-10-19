import { isRecording } from '../data/recordingValidation';
import type { Recording } from '../types/recording';

export const PROBE_STORAGE_KEY = '903player:probed:v1';

export interface ProbeState {
    /** app 自己搵到、feed 未有嘅錄音 */
    found: Recording[];
    /** `${showId}:${date}` → 上次搵唔到嘅時間（ms），用嚟限制重試頻率 */
    misses: Record<string, number>;
}

const EMPTY_STATE: ProbeState = { found: [], misses: {} };

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
            return EMPTY_STATE;
        }
        return {
            found: Array.isArray(parsed.found) ? parsed.found.filter(isRecording) : [],
            misses: readMisses(parsed.misses),
        };
    } catch {
        return EMPTY_STATE;
    }
};

export const writeProbeState = (state: ProbeState): void => {
    try {
        localStorage.setItem(PROBE_STORAGE_KEY, JSON.stringify(state));
    } catch {
        // 私人瀏覽 / 空間不足：下次再 probe 就得，唔影響今次結果
    }
};
