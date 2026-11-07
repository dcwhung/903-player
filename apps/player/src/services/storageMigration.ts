/*
 * v1 → v2 storage migration（v1.29）：進度 / 收藏由音檔 URL key 改為 episode ID key。
 * main.tsx 喺 render 之前每次開 app 都跑，idempotent：
 * - 對到 ID 嘅寫入 v2；v2 已經有嗰個 ID 就唔覆蓋（新版寫低嘅優先）
 * - 對唔到嘅留喺 v1，下次開 app 再試（例如之後重新上架嘅集數）
 * - v1 原封不動（唔刪唔改）：方便 rollback 返 v1.28；最少保留到 v1.32 先清
 * - 收藏另外記低已搬過嘅 v1 URL，喺 v2 移除咗嘅收藏唔會由 v1 復活
 * - 任何 localStorage / JSON 錯誤都食咗，唔阻 app render
 */
import { dailyEpisodeId, type DramaEpisode, showEpisodeId } from '@903-player/catalog';
import { catalogEpisodesOf, DRAMAS } from '../catalog/dramas';
import { BOOKMARK_MIGRATED_STORAGE_KEY } from '../config/constants';
import type { Recording } from '../types/recording';
import { showEpisodeOfUrl } from './audioProbe';
import {
    hasBookmark,
    mergeBookmarks,
    readLegacyBookmarks,
    type Bookmark,
    type LegacyBookmark,
} from './bookmarkStore';
import { readProbeState } from './probeStore';
import { mergeProgress, readLegacyProgress, type Progress } from './progressStore';

type UrlIndex = ReadonlyMap<string, string>;
type Episode = Pick<DramaEpisode | Recording, 'url' | 'id'>;

/** 全部劇集嘅全部集數：包括停用劇、已下架、未上架（registry 嘅 catalogEpisodesOf 唔按日子篩） */
const allCatalogEpisodes = (): readonly DramaEpisode[] =>
    DRAMAS.flatMap((drama) => catalogEpisodesOf(drama.id));

/** URL → episode ID 對照表：catalog 集數 + probe store 搵到嘅節目錄音 */
export const catalogUrlIndex = (
    episodes: readonly Episode[] = allCatalogEpisodes(),
    recordings: readonly Episode[] = readProbeState().found,
): UrlIndex => new Map([...episodes, ...recordings].map((e) => [e.url, e.id]));

/** 對照表冇嘅節目錄音 URL（例如過咗 probe 範圍）由 URL 本身反推 */
const idOfUrl = (index: UrlIndex, url: string): string | undefined => {
    const show = showEpisodeOfUrl(url);
    return index.get(url) ?? (show && showEpisodeId(show.showId, show.date));
};

/** 短篇劇：用劇 + 短篇名 + 集數喺 catalog 搵返嗰集（URL 變咗都搵到） */
const seriesIdOf = (dramaId: string, arc: string, no: number): string | undefined =>
    catalogEpisodesOf(dramaId).find((e) => e.kind === 'series' && e.arc === arc && e.no === no)?.id;

/** 收藏：先用 URL，對唔到就由收藏自己記低嘅欄位計 */
const bookmarkIdOf = (index: UrlIndex, b: LegacyBookmark): string | undefined => {
    const byUrl = idOfUrl(index, b.url);
    if (byUrl !== undefined) return byUrl;
    if (b.kind === 'show') return showEpisodeId(b.showId, b.date);
    if (b.kind === 'daily') return dailyEpisodeId(b.dramaId, b.date);
    return seriesIdOf(b.dramaId, b.arc, b.no);
};

const migrateProgress = (index: () => UrlIndex): void => {
    const legacy = Object.entries(readLegacyProgress());
    if (legacy.length === 0) return;
    const entries = legacy.flatMap(([url, progress]): [string, Progress][] => {
        const id = idOfUrl(index(), url);
        return id === undefined ? [] : [[id, progress]];
    });
    mergeProgress(Object.fromEntries(entries));
};

const readMigratedUrls = (): Set<string> => {
    const parsed: unknown = JSON.parse(localStorage.getItem(BOOKMARK_MIGRATED_STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((u) => typeof u === 'string') : []);
};

const migrateBookmarks = (index: () => UrlIndex): void => {
    const done = readMigratedUrls();
    const pending = readLegacyBookmarks().filter((b) => !done.has(b.url));
    const moved = pending.flatMap((b): Bookmark[] => {
        const id = bookmarkIdOf(index(), b);
        return id === undefined ? [] : [{ ...b, id }];
    });
    if (moved.length === 0) return;
    mergeBookmarks(moved);
    // v2 寫唔到（例如空間不足，writeAll 食咗錯誤）就唔記，下次開 app 再搬（W-698）
    const saved = moved.filter((b) => hasBookmark(b.id));
    if (saved.length === 0) return;
    saved.forEach((b) => done.add(b.url));
    localStorage.setItem(BOOKMARK_MIGRATED_STORAGE_KEY, JSON.stringify([...done]));
};

/** 對照表要用先砌（冇 v1 資料就唔使行成個 catalog），砌一次重用 */
const lazy = <T>(build: () => T): (() => T) => {
    let value: T | undefined;
    return () => (value ??= build());
};

/** app 啟動（render 之前）叫；index 可以注入（測試用） */
export const migrateStorage = ({ index }: { index?: UrlIndex } = {}): void => {
    const getIndex = index ? () => index : lazy(() => catalogUrlIndex());
    // 兩樣分開 try：進度出錯都照搬收藏
    try {
        migrateProgress(getIndex);
    } catch {
        // 壞資料 / storage 讀唔到：留待下次開 app 再試，唔阻 render
    }
    try {
        migrateBookmarks(getIndex);
    } catch {
        // 同上
    }
};
