import { PROGRESS_STORAGE_KEY, PROGRESS_V1_STORAGE_KEY, WATCHED_RATIO } from '../config/constants';

/*
 * 收聽進度：key = episode ID（drama:… / show:…，見 @903-player/catalog 嘅 core/episodeId.ts），唔係音檔 URL，
 * 換 bucket / 改檔名都唔會冇咗。v1（URL key）由 storageMigration 搬過嚟
 */

export interface Progress {
    position: number;
    duration: number;
    watched: boolean;
    updatedAt: number;
}

type ProgressMap = Record<string, Progress>;

const isProgress = (value: unknown): value is Progress => {
    const p = value as Progress;
    return (
        typeof p === 'object' &&
        p !== null &&
        typeof p.position === 'number' &&
        typeof p.duration === 'number' &&
        typeof p.watched === 'boolean'
    );
};

const readFrom = (key: string): ProgressMap => {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
        if (typeof parsed !== 'object' || parsed === null) {
            return {};
        }
        return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isProgress(value)));
    } catch {
        return {};
    }
};

const readAll = (): ProgressMap => readFrom(PROGRESS_STORAGE_KEY);

const writeAll = (map: ProgressMap): void => {
    try {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(map));
    } catch {
        // 私人瀏覽 / 空間不足：進度只係方便功能，失敗唔影響播放
    }
};

const reachedWatchedRatio = (position: number, duration: number): boolean =>
    Number.isFinite(duration) && duration > 0 && position / duration >= WATCHED_RATIO;

export const getProgress = (id: string): Progress | undefined => readAll()[id];

export const isWatched = (id: string): boolean => getProgress(id)?.watched ?? false;

/** 一次過讀晒所有進度（episode ID → 進度；集數清單用；幾時重新讀見 useRefreshedOn） */
export const getProgressMap = (): Readonly<Record<string, Progress>> => readAll();

/**
 * 一次過讀晒所有聽過嘅 episode ID，避免每個項目都 parse 一次 localStorage。
 * 幾時重新讀見 useRefreshedOn。
 */
export const getWatchedIds = (): Set<string> =>
    new Set(
        Object.entries(readAll())
            .filter(([, progress]) => progress.watched)
            .map(([id]) => id),
    );

/** 未聽完就由上次位置續播；聽過就由頭 */
export const getResumePosition = (id: string): number => {
    const progress = getProgress(id);
    return progress && !progress.watched ? progress.position : 0;
};

const writeProgress = (
    id: string,
    position: number,
    duration: number,
    keepWatched: boolean,
): Progress => {
    const all = readAll();
    const progress: Progress = {
        position,
        duration: Number.isFinite(duration) ? duration : 0,
        watched:
            (keepWatched && (all[id]?.watched ?? false)) || reachedWatchedRatio(position, duration),
        updatedAt: Date.now(),
    };
    writeAll({ ...all, [id]: progress });
    return progress;
};

/** 一旦聽過就一直當聽過（seek 返前都唔會取消），除非 resetWatched */
export const saveProgress = (id: string, position: number, duration: number): Progress =>
    writeProgress(id, position, duration, true);

/** 聽過嘅錄音重新再聽：清走「已收聽」，由呢個位置重新記錄（再到 95% 先再當聽過） */
export const resetWatched = (id: string, position: number, duration: number): Progress =>
    writeProgress(id, position, duration, false);

/** v1 舊進度（key = 音檔 URL；只讀，migration 用）；冇 / 壞咗就空 */
export const readLegacyProgress = (): Readonly<Record<string, Progress>> =>
    readFrom(PROGRESS_V1_STORAGE_KEY);

/**
 * migration 用：加入 v2 未有嘅 ID（已有嘅唔覆蓋，新版嘅進度優先）；回傳加咗幾多條。
 * 冇嘢要加就唔寫 storage
 */
export const mergeProgress = (entries: Readonly<Record<string, Progress>>): number => {
    const all = readAll();
    const added = Object.entries(entries).filter(([id]) => all[id] === undefined);
    if (added.length > 0) writeAll({ ...all, ...Object.fromEntries(added) });
    return added.length;
};
