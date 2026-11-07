import { useMemo } from 'react';
import { hkToday } from '@903-player/catalog';
import type {
    RecentRowView,
    SavedBoxView,
    SavedRowView,
    SavedTabView,
} from '../../components/pages/home/SavedTab/savedTypes';
import { dramaStatus } from '../../catalog/dramas';
import { useRecordings } from '../../data/useRecordings';
import { useRefreshedOn } from '../../hooks/useRefreshedOn';
import { usePlayer } from '../../player/usePlayer';
import {
    groupBookmarks,
    recentColumns,
    recentListens,
    savedGrid,
    thirdTabOf,
    type BookmarkBox,
    type SavedLayout,
    type ThirdTab,
} from '../../selectors/bookmarks';
import { removeBookmark, useBookmarks, type Bookmark } from '../../services/bookmarkStore';
import { getProgressMap, type Progress } from '../../services/progressStore';
import type { Track } from '../../types/track';
import { zoomKey } from '../../utils/cardZoom';
import {
    bookmarkAvailability,
    bookmarkLabel,
    bookmarkSpokenLabel,
    bookmarkPage,
    bookmarkTrack,
    boxMeta,
    isKnownBookmark,
    playableIndex,
    recentText,
    seriesSpokenName,
    savedRowStatus,
    trackArt,
    trackLeaving,
    trackPage,
    type EpisodePage,
} from './savedItems';
import { useTileOpen, type HomeRight } from './useTileOpen';

/** 收藏咗而且節目 / 劇仲喺 app 度嘅集（主頁用嚟決定出唔出 ★ tab） */
export const useKnownBookmarks = (): readonly Bookmark[] => {
    const all = useBookmarks();
    return useMemo(() => all.filter(isKnownBookmark), [all]);
};

/** 撳行 / 最近收聽：入嗰集節目頁 / 劇集頁（唔播），由嗰行 zoom 入頁，帶 focusUrl 捲去嗰集 */
const useOpenEpisode = (right: HomeRight) => {
    const open = useTileOpen(right);
    return (url: string, target: EpisodePage) =>
        open({ key: zoomKey.episode(url), ...target, starts: false, state: { focusUrl: url } });
};

interface RowContext {
    recordings: ReturnType<typeof useRecordings>['recordings'];
    progressMap: Readonly<Record<string, Progress>>;
    player: ReturnType<typeof usePlayer>;
    openEpisode: ReturnType<typeof useOpenEpisode>;
    today: string;
}

/** 一行：狀態跟 player（播緊呢集用即時時間）或者存低嘅進度；▷ 開播喺 click 入面直接做（iOS 自動播） */
const rowView = (b: Bookmark, name: string, ctx: RowContext): SavedRowView => {
    const { player } = ctx;
    const loaded = player.recording?.id === b.id;
    const live = loaded
        ? { currentTime: player.currentTime, duration: player.duration }
        : undefined;
    const progress = ctx.progressMap[b.id];
    const status = savedRowStatus({ loaded, isPlaying: player.isPlaying, live, progress });
    const track = bookmarkTrack(b, ctx.recordings);
    return {
        key: b.url,
        label: bookmarkLabel(b),
        spokenLabel: bookmarkSpokenLabel(b),
        name,
        ...status,
        status: status.text,
        zoomKey: zoomKey.episode(b.url),
        onOpen: () => ctx.openEpisode(b.url, bookmarkPage(b)),
        onPlay: () => void (loaded ? player.toggle() : player.load(track, { autoplay: true })),
        onRemove: () => removeBookmark(b.id),
        ...bookmarkAvailability(b, ctx.today),
    };
};

/** 一個 box：banner + 每段（碟用段入面第一集嘅碟） */
const boxView = (box: BookmarkBox, ctx: RowContext): SavedBoxView => {
    const { title, banner } = boxMeta(box.kind, box.id);
    const sections = box.sections.map((section) => {
        const first = section.items[0];
        const art = first ? trackArt(bookmarkTrack(first, ctx.recordings)) : '';
        // name 淨係用喺行嘅讀屏名：短篇劇名用讀屏版（S-716）
        const name = section.arc ? seriesSpokenName(title, section.arc) : title;
        const rows = section.items.map((b) => rowView(b, name, ctx));
        return { key: section.key, art, rows, ...(section.arc && { heading: section.arc }) };
    });
    // 成套劇已下架：banner 變灰（每日劇 / 短篇劇都係）
    const removed = box.kind === 'drama' && dramaStatus(box.id, ctx.today) === 'removed';
    return { key: box.key, kind: box.kind, title, banner, sections, removed };
};

/**
 * 進度記錄：轉集、有集數聽完、停低存完進度（progressRevision：controller persist 之後先 +1，
 * 第一次聽嘅集先入到最近收聽，唔靠 isPlaying 同 persist 嘅先後，S-710）、收藏有變先重新讀
 */
const useProgressMap = (bookmarks: readonly Bookmark[]) => {
    const { watchedRevision, progressRevision, recording } = usePlayer();
    return useRefreshedOn(getProgressMap, [
        watchedRevision,
        progressRevision,
        recording?.url,
        bookmarks,
    ]);
};

/**
 * 最近收聽：progressStore 最新 10 集（除走已收藏、認唔到嘅）。
 * 主頁每個播放 tick 都 render：成個進度 map 排序只跟真正輸入重計（S-709）
 */
const useRecentTracks = (
    bookmarks: readonly Bookmark[],
    progressMap: Readonly<Record<string, Progress>>,
): Track[] => {
    const { recordings } = useRecordings();
    const index = useMemo(() => playableIndex(recordings), [recordings]);
    return useMemo(() => {
        const bookmarked = new Set(bookmarks.map((b) => b.id));
        return recentListens({ progressMap, bookmarked, resolve: (id) => index.get(id) });
    }, [bookmarks, progressMap, index]);
};

/**
 * 主頁第三個 tab 出唔出、出邊款（thirdTabOf）：★ 我的收藏 / 歷史 icon 最近收聽 / null 唔出。
 * 主頁一直要知（tab 喺度），所以喺 HomePage 計，唔等揀中收藏 tab
 */
export const useThirdTab = (): ThirdTab | null => {
    const bookmarks = useKnownBookmarks();
    const recent = useRecentTracks(bookmarks, useProgressMap(bookmarks));
    return thirdTabOf({ hasSaved: bookmarks.length > 0, hasRecent: recent.length > 0 });
};

/**
 * 主頁第三個 tab 要嘅嘢：有收藏（saved）= box（分組 / 次序見 groupBookmarks）+ 最近收聽、分幾欄（savedGrid）；
 * 冇收藏（recent）= 成個 tab 係最近收聽（分欄見 recentColumns）
 */
export const useSavedView = (layout: SavedLayout, right: HomeRight): SavedTabView => {
    const bookmarks = useKnownBookmarks();
    const player = usePlayer();
    const { recordings } = useRecordings();
    const openEpisode = useOpenEpisode(right);
    const progressMap = useProgressMap(bookmarks);
    const groups = useMemo(() => groupBookmarks(bookmarks), [bookmarks]);
    const today = hkToday();
    const ctx: RowContext = { recordings, progressMap, player, openEpisode, today };
    const recent = useRecentTracks(bookmarks, progressMap).map((track): RecentRowView => ({
        key: track.url,
        ...recentText(track),
        art: trackArt(track),
        track,
        leaving: trackLeaving(track, today),
        onOpen: () => openEpisode(track.url, trackPage(track)),
    }));
    const hasRecent = recent.length > 0;
    const grid = savedGrid({ layout, boxCount: groups.length, hasRecent });
    // 兩樣都冇時主頁唔會出呢個 tab（useHomeTab 跳返節目）；呢度當有收藏版畫
    const mode = thirdTabOf({ hasSaved: groups.length > 0, hasRecent }) ?? 'saved';
    const boxes = groups.map((box) => boxView(box, ctx));
    return { mode, layout, boxes, recent, ...grid, recentColumns: recentColumns(layout) };
};
