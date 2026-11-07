import { useSyncExternalStore } from 'react';
import type { DramaId } from '@903-player/catalog';
import {
    BOOKMARK_STORAGE_KEY,
    BOOKMARK_STORE_VERSION,
    BOOKMARK_V1_STORAGE_KEY,
    BOOKMARK_V1_STORE_VERSION,
} from '../config/constants';
import type { ShowId } from '../types/recording';
import { isDramaEpisode, type Track } from '../types/track';

/**
 * 收藏單位係一集（P7 #7）：用 episode ID 搵（v2）；url 淨係留低播放用（錄音清單冇咗嗰集都播得）。
 * 每集記低顯示要嘅資料（節目 / 劇、短篇、日子 / 集數），
 * 錄音清單冇咗嗰集（例如過咗 probe 範圍）收藏 tab 照顯示得到
 */
interface BookmarkBase {
    /** episode ID（@903-player/catalog 嘅 core/episodeId.ts）：查找 / 移除一律用佢 */
    id: string;
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

/** v1 舊收藏：冇 id（storageMigration 補） */
export type LegacyBookmark =
    Omit<ShowBookmark, 'id'> | Omit<SeriesBookmark, 'id'> | Omit<DailyBookmark, 'id'>;

/** 一集（player 播得嘅 Track）→ 收藏資料 */
export const bookmarkOf = (track: Track, addedAt: number): Bookmark => {
    const { id, url } = track;
    if (!isDramaEpisode(track)) {
        const { showId, date, time } = track;
        return { kind: 'show', id, url, showId, date, time, addedAt };
    }
    if (track.kind === 'daily') {
        const { dramaId, date, rerun } = track;
        return { kind: 'daily', id, url, dramaId, date, rerun, addedAt };
    }
    const { dramaId, arc, no, title } = track;
    return { kind: 'series', id, url, dramaId, arc, no, ...(title ? { title } : {}), addedAt };
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

/** v1 / v2 共用嘅欄位（v1 冇 id） */
const isLegacyBookmark = (value: unknown): value is LegacyBookmark => {
    if (typeof value !== 'object' || value === null) return false;
    const b = value as Fields;
    const valid = VALID_KIND[b.kind as Bookmark['kind']];
    return isText(b.url) && typeof b.addedAt === 'number' && valid !== undefined && valid(b);
};

const isBookmark = (value: unknown): value is Bookmark =>
    isLegacyBookmark(value) && isText((value as Fields).id);

const EMPTY: readonly Bookmark[] = [];

/** { version, items } 入面合格嘅項目；version 唔啱、壞 JSON 就空 */
const parseItems = <T>(
    raw: string | null,
    version: number,
    isItem: (value: unknown) => value is T,
): readonly T[] | undefined => {
    if (raw === null) return undefined;
    try {
        const data = JSON.parse(raw) as { version?: unknown; items?: unknown } | null;
        if (data?.version !== version || !Array.isArray(data.items)) return undefined;
        return data.items.filter(isItem);
    } catch {
        return undefined;
    }
};

const parse = (raw: string | null): readonly Bookmark[] =>
    parseItems(raw, BOOKMARK_STORE_VERSION, isBookmark) ?? EMPTY;

const readRaw = (key: string = BOOKMARK_STORAGE_KEY): string | null => {
    try {
        return localStorage.getItem(key);
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

export const hasBookmark = (id: string): boolean => listBookmarks().some((b) => b.id === id);

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
    if (hasBookmark(track.id)) return;
    writeAll([...listBookmarks(), bookmarkOf(track, now)]);
};

export const removeBookmark = (id: string): void => {
    const items = listBookmarks();
    if (!items.some((b) => b.id === id)) return;
    writeAll(items.filter((b) => b.id !== id));
};

/** 收藏 ⇄ 移除；回傳之後係咪收藏緊 */
export const toggleBookmark = (track: Track, now: number = Date.now()): boolean => {
    if (hasBookmark(track.id)) {
        removeBookmark(track.id);
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

export const useIsBookmarked = (id: string): boolean => {
    const read = () => hasBookmark(id);
    return useSyncExternalStore(subscribeBookmarks, read, read);
};

/** v1 舊收藏（只讀，migration 用）；冇 / 壞咗 / 版本唔啱就空 */
export const readLegacyBookmarks = (): readonly LegacyBookmark[] =>
    parseItems(readRaw(BOOKMARK_V1_STORAGE_KEY), BOOKMARK_V1_STORE_VERSION, isLegacyBookmark) ?? [];

/**
 * migration 用：v2 未有嘅 ID 加喺尾（已有嘅唔覆蓋）；回傳加咗幾多條。冇嘢要加就唔寫、唔通知
 */
export const mergeBookmarks = (items: readonly Bookmark[]): number => {
    const seen = new Set(listBookmarks().map((b) => b.id));
    const added: Bookmark[] = [];
    for (const b of items) {
        if (seen.has(b.id)) continue;
        seen.add(b.id);
        added.push(b);
    }
    if (added.length > 0) writeAll([...listBookmarks(), ...added]);
    return added.length;
};
