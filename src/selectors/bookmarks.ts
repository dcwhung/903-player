import type { Bookmark } from '../services/bookmarkStore';
import type { Progress } from '../services/progressStore';

/** 收藏 tab 嘅一段：節目本身 / 每日劇成套一段；短篇劇每個短篇一段（arc） */
export interface BookmarkSection {
    key: string;
    arc?: string;
    items: readonly Bookmark[];
}

/** 收藏 tab 嘅一個 box：一個節目或者一套劇 */
export interface BookmarkBox {
    /** show:<id> / drama:<id> */
    key: string;
    kind: 'show' | 'drama';
    id: string;
    sections: readonly BookmarkSection[];
}

const boxOf = (b: Bookmark): Pick<BookmarkBox, 'key' | 'kind' | 'id'> =>
    b.kind === 'show'
        ? { key: `show:${b.showId}`, kind: 'show', id: b.showId }
        : { key: `drama:${b.dramaId}`, kind: 'drama', id: b.dramaId };

const sectionKeyOf = (b: Bookmark): string =>
    b.kind === 'series' ? `${boxOf(b).key}:${b.arc}` : boxOf(b).key;

const newest = (items: readonly Bookmark[]): number => Math.max(...items.map((b) => b.addedAt));

/** 段入面：節目 / 每日劇日子新到舊；短篇劇集數細到大 */
const byEpisode = (a: Bookmark, b: Bookmark): number => {
    if (a.kind === 'series' && b.kind === 'series') return a.no - b.no;
    if (a.kind !== 'series' && b.kind !== 'series') return b.date.localeCompare(a.date);
    return 0;
};

/** 同一個 key 嘅放埋一齊（保留第一次見到嘅次序） */
const bucket = <T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> => {
    const map = new Map<string, T[]>();
    items.forEach((item) => {
        const key = keyOf(item);
        map.set(key, [...(map.get(key) ?? []), item]);
    });
    return map;
};

const toSection = (key: string, items: Bookmark[]): BookmarkSection => {
    const [first] = items;
    const arc = first?.kind === 'series' ? first.arc : undefined;
    return { key, ...(arc === undefined ? {} : { arc }), items: [...items].sort(byEpisode) };
};

const allItems = (box: BookmarkBox) => box.sections.flatMap((s) => s.items);

/** box / 段次序跟最新收藏（新喺前）；段入面見 byEpisode */
export const groupBookmarks = (bookmarks: readonly Bookmark[]): BookmarkBox[] =>
    [...bucket(bookmarks, (b) => boxOf(b).key).values()]
        .map((items) => {
            const sections = [...bucket(items, sectionKeyOf)]
                .map(([key, list]) => toSection(key, list))
                .sort((p, q) => newest(q.items) - newest(p.items));
            return { ...boxOf(items[0] as Bookmark), sections };
        })
        .sort((p, q) => newest(allItems(q)) - newest(allItems(p)));

/** 「最近收聽」最多幾集 */
export const RECENT_MAX = 10;

interface RecentInput<T> {
    progressMap: Readonly<Record<string, Progress>>;
    /** 已經收藏咗嘅 URL（唔再出） */
    bookmarked: ReadonlySet<string>;
    /** URL → 顯示資料；認唔到（節目 / 劇冇咗、錄音清單冇）就 undefined，唔出 */
    resolve: (url: string) => T | undefined;
}

/** 「最近收聽」：由進度記錄（updatedAt）揀最新嘅，除走已收藏同認唔到嘅；唔另外儲 */
export const recentListens = <T>({ progressMap, bookmarked, resolve }: RecentInput<T>): T[] =>
    Object.entries(progressMap)
        .filter(([url]) => !bookmarked.has(url))
        .sort(([, a], [, b]) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .map(([url]) => resolve(url))
        .filter((item): item is T => item !== undefined)
        .slice(0, RECENT_MAX);

/** 收藏 tab 版面：phone = 直版；land = 手機打橫（SHORT_LANDSCAPE_QUERY）；wide = 闊橫版主頁 */
export type SavedLayout = 'phone' | 'land' | 'wide';

interface SavedGridInput {
    layout: SavedLayout;
    boxCount: number;
    /** 有冇「最近收聽」panel（窄橫版放喺右邊，佔一欄位） */
    hasRecent: boolean;
}

const BASE_COLUMNS: Record<SavedLayout, number> = { phone: 1, land: 3, wide: 2 };

/**
 * 收藏 box 分幾欄：直版 1；窄橫版 3（右邊有最近收聽就 2）；闊橫版 2。
 * 得一個 box（solo）就用盡闊度唔分欄，banner 喺上面放大（見 SavedBox）
 */
export const savedGrid = ({ layout, boxCount, hasRecent }: SavedGridInput) => {
    const solo = boxCount === 1;
    const sideRecent = layout === 'land' && hasRecent;
    const columns = solo ? 1 : BASE_COLUMNS[layout] - (sideRecent ? 1 : 0);
    return { columns, solo };
};
