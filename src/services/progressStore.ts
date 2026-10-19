import { PROGRESS_STORAGE_KEY, WATCHED_RATIO } from '../config/constants';

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

const readAll = (): ProgressMap => {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) ?? '{}');
        if (typeof parsed !== 'object' || parsed === null) {
            return {};
        }
        return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isProgress(value)));
    } catch {
        return {};
    }
};

const writeAll = (map: ProgressMap): void => {
    try {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(map));
    } catch {
        // 私人瀏覽 / 空間不足：進度只係方便功能，失敗唔影響播放
    }
};

const reachedWatchedRatio = (position: number, duration: number): boolean =>
    Number.isFinite(duration) && duration > 0 && position / duration >= WATCHED_RATIO;

/** `_revision` 只用嚟做 useMemo 嘅 invalidation key */
export const getProgress = (url: string, _revision?: number): Progress | undefined =>
    readAll()[url];

export const isWatched = (url: string): boolean => getProgress(url)?.watched ?? false;

/**
 * 一次過讀晒所有進度（集數清單用）。
 * `_revision` 只用嚟做 useMemo 嘅 invalidation key。
 */
export const getProgressMap = (_revision?: number): Readonly<Record<string, Progress>> => readAll();

/**
 * 一次過讀晒所有聽過嘅 URL，避免每個項目都 parse 一次 localStorage。
 * `_revision` 只用嚟做 useMemo 嘅 invalidation key。
 */
export const getWatchedUrls = (_revision?: number): Set<string> =>
    new Set(
        Object.entries(readAll())
            .filter(([, progress]) => progress.watched)
            .map(([url]) => url),
    );

/** 未聽完就由上次位置續播；聽過就由頭 */
export const getResumePosition = (url: string): number => {
    const progress = getProgress(url);
    return progress && !progress.watched ? progress.position : 0;
};

export const saveProgress = (url: string, position: number, duration: number): Progress => {
    const all = readAll();
    const progress: Progress = {
        position,
        duration: Number.isFinite(duration) ? duration : 0,
        watched: (all[url]?.watched ?? false) || reachedWatchedRatio(position, duration),
        updatedAt: Date.now(),
    };
    writeAll({ ...all, [url]: progress });
    return progress;
};
