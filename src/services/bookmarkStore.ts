import { useSyncExternalStore } from 'react';
import { BOOKMARK_STORAGE_KEY, BOOKMARK_STORE_VERSION } from '../config/constants';
import type { DramaId } from '../types/drama';
import type { ShowId } from '../types/recording';
import { isDramaEpisode, type Track } from '../types/track';

/**
 * 收藏單位係一集（P7 #7）：key = 音檔 URL。每集記低顯示要嘅資料（節目 / 劇、短篇、日子 / 集數），
 * 錄音清單冇咗嗰集（例如過咗 probe 範圍）收藏 tab 照顯示得到
 */
interface BookmarkBase {
    url: string;
    /** 收藏嘅時間（Date.now()）：收藏 tab 嘅次序跟最新收藏 */
    addedAt: number;
}

export interface ShowBookmark extends BookmarkBase {
    kind: 'show';
    showId: ShowId;
    /** 香港日期 YYYY-MM-DD */
    date: string;
    /** 開咪時間 HHMM（砌返 Recording 播放用） */
    time: string;
}

export interface SeriesBookmark extends BookmarkBase {
    kind: 'series';
    dramaId: DramaId;
    arc: string;
    no: number;
    title?: string;
}

export interface DailyBookmark extends BookmarkBase {
    kind: 'daily';
    dramaId: DramaId;
    date: string;
    rerun: boolean;
}

export type Bookmark = ShowBookmark | SeriesBookmark | DailyBookmark;

/** 一集（player 播得嘅 Track）→ 收藏資料 */
export const bookmarkOf = (track: Track, addedAt: number): Bookmark => {
    const { url } = track;
    if (!isDramaEpisode(track)) {
        const { showId, date, time } = track;
        return { kind: 'show', url, showId, date, time, addedAt };
    }
    if (track.kind === 'daily') {
        const { dramaId, date, rerun } = track;
        return { kind: 'daily', url, dramaId, date, rerun, addedAt };
    }
    const { dramaId, arc, no, title } = track;
    return { kind: 'series', url, dramaId, arc, no, ...(title ? { title } : {}), addedAt };
};

type Fields = Record<string, unknown>;

const isText = (value: unknown): value is string => typeof value === 'string' && value !== '';

/** 每款收藏要有嘅欄位（壞資料、舊版本就成條唔要） */
const VALID_KIND: Record<Bookmark['kind'], (b: Fields) => boolean> = {
    show: (b) => isText(b.showId) && isText(b.date) && typeof b.time === 'string',
    series: (b) =>
        isText(b.dramaId) &&
        isText(b.arc) &&
        typeof b.no === 'number' &&
        (b.title === undefined || typeof b.title === 'string'),
    daily: (b) => isText(b.dramaId) && isText(b.date) && typeof b.rerun === 'boolean',
};

const isBookmark = (value: unknown): value is Bookmark => {
    if (typeof value !== 'object' || value === null) return false;
    const b = value as Fields;
    const valid = VALID_KIND[b.kind as Bookmark['kind']];
    return isText(b.url) && typeof b.addedAt === 'number' && valid !== undefined && valid(b);
};

const EMPTY: readonly Bookmark[] = [];

const parse = (raw: string | null): readonly Bookmark[] => {
    if (raw === null) return EMPTY;
    try {
        const data = JSON.parse(raw) as { version?: unknown; items?: unknown } | null;
        if (data?.version !== BOOKMARK_STORE_VERSION || !Array.isArray(data.items)) return EMPTY;
        return data.items.filter(isBookmark);
    } catch {
        return EMPTY;
    }
};

const readRaw = (): string | null => {
    try {
        return localStorage.getItem(BOOKMARK_STORAGE_KEY);
    } catch {
        return null;
    }
};

/** 同一段原文就用返同一個 array（useSyncExternalStore 要穩定 snapshot；外面清咗 storage 都跟到） */
let cache: { raw: string | null; items: readonly Bookmark[] } = { raw: null, items: EMPTY };

export const listBookmarks = (): readonly Bookmark[] => {
    const raw = readRaw();
    if (raw !== cache.raw) cache = { raw, items: parse(raw) };
    return cache.items;
};

export const hasBookmark = (url: string): boolean => listBookmarks().some((b) => b.url === url);

const listeners = new Set<() => void>();

const writeAll = (items: readonly Bookmark[]): void => {
    try {
        localStorage.setItem(
            BOOKMARK_STORAGE_KEY,
            JSON.stringify({ version: BOOKMARK_STORE_VERSION, items }),
        );
    } catch {
        // 私人瀏覽 / 空間不足：記唔低就算，唔影響播放
    }
    listeners.forEach((listener) => listener());
};

/** 已經收藏咗就唔再加（保留第一次收藏嘅時間） */
export const addBookmark = (track: Track, now: number = Date.now()): void => {
    if (hasBookmark(track.url)) return;
    writeAll([...listBookmarks(), bookmarkOf(track, now)]);
};

export const removeBookmark = (url: string): void => {
    const items = listBookmarks();
    if (!items.some((b) => b.url === url)) return;
    writeAll(items.filter((b) => b.url !== url));
};

/** 收藏 ⇄ 移除；回傳之後係咪收藏緊 */
export const toggleBookmark = (track: Track, now: number = Date.now()): boolean => {
    if (hasBookmark(track.url)) {
        removeBookmark(track.url);
        return false;
    }
    addBookmark(track, now);
    return true;
};

/** 本頁改動 + 其他分頁改咗 localStorage（storage event）都通知 */
export const subscribeBookmarks = (listener: () => void): (() => void) => {
    listeners.add(listener);
    window.addEventListener('storage', listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', listener);
    };
};

export const useBookmarks = (): readonly Bookmark[] =>
    useSyncExternalStore(subscribeBookmarks, listBookmarks, listBookmarks);

export const useIsBookmarked = (url: string): boolean => {
    const read = () => hasBookmark(url);
    return useSyncExternalStore(subscribeBookmarks, read, read);
};
