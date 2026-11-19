import { SLEEP_TIMER_LAST_STORAGE_KEY, SLEEP_TIMER_STORAGE_KEY } from '../config/constants';
import { isSleepTimerOption, type SleepTimerOption, type SleepTimerState } from './sleepTimer';

/**
 * 私密瀏覽 / 封鎖網站資料時 storage 可能拋錯：一律當冇，唔可以令播放器壞（9d）
 */
const readItem = (storage: () => Storage, key: string): string | null => {
    try {
        return storage().getItem(key);
    } catch {
        return null;
    }
};

const writeItem = (storage: () => Storage, key: string, value: string | null): void => {
    try {
        if (value === null) {
            storage().removeItem(key);
        } else {
            storage().setItem(key, value);
        }
    } catch {
        // 存唔到只係重新載入唔記得，唔影響今次
    }
};

const parseJson = (raw: string | null): unknown => {
    if (raw === null) {
        return undefined;
    }
    try {
        return JSON.parse(raw) as unknown;
    } catch {
        return undefined;
    }
};

const session = () => sessionStorage;
const local = () => localStorage;

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);

/** 舊版 / 手改過嘅資料唔信：唔合格就當冇 timer */
const toTimer = (value: unknown): SleepTimerState | null => {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const { kind, option, startedAt, deadline, episodeId } = value as Record<string, unknown>;
    if (
        !isSleepTimerOption(option) ||
        !isFiniteNumber(startedAt) ||
        !isFiniteNumber(deadline) ||
        deadline < startedAt
    ) {
        return null;
    }
    if (kind === 'minutes') {
        return { kind, option, startedAt, deadline };
    }
    if (kind === 'episode' && typeof episodeId === 'string') {
        return { kind, option, startedAt, deadline, episodeId };
    }
    return null;
};

/**
 * 同一分頁重新載入照計；壞咗 / 已過期嘅分鐘倒數就清走（唔會自動播，只係冇 timer）。
 * 「播完呢集」過咗 background 截止時間都照還原：同一集要等播完先清（S-1180），
 * 由 SleepTimerController 睇載咗邊集再判斷（唔係同一集就淨係清、唔暫停）
 */
export const loadSleepTimer = (now: number): SleepTimerState | null => {
    const raw = readItem(session, SLEEP_TIMER_STORAGE_KEY);
    if (raw === null) {
        return null;
    }
    const timer = toTimer(parseJson(raw));
    if (!timer || (timer.kind === 'minutes' && now >= timer.deadline)) {
        writeItem(session, SLEEP_TIMER_STORAGE_KEY, null);
        return null;
    }
    return timer;
};

/** null = 清走（取消 / 時間到） */
export const saveSleepTimer = (timer: SleepTimerState | null): void =>
    writeItem(session, SLEEP_TIMER_STORAGE_KEY, timer && JSON.stringify(timer));

/** 上次揀嘅選項（跨分頁 / 重開 app 都記得） */
export const loadLastOption = (): SleepTimerOption | null => {
    const value = parseJson(readItem(local, SLEEP_TIMER_LAST_STORAGE_KEY));
    return isSleepTimerOption(value) ? value : null;
};

export const saveLastOption = (option: SleepTimerOption): void =>
    writeItem(local, SLEEP_TIMER_LAST_STORAGE_KEY, JSON.stringify(option));
