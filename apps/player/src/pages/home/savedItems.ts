import { isLeavingSoon, isRemoved } from '@903-player/catalog';
import {
    catalogEpisodeOf,
    dramaArtFor,
    dramaEpisodesOf,
    dramaStatus,
    enabledDramas,
    findEnabledDrama,
} from '../../catalog/dramas';
import { findShow, themeFor } from '../../catalog/shows';
import { t } from '../../i18n/t';
import { spokenRemoval, removalWhen } from '../../selectors/availabilityLabels';
import type { InnerPage } from '../../selectors/pageHandle';
import type { Bookmark } from '../../services/bookmarkStore';
import type { Progress } from '../../services/progressStore';
import type { Recording } from '../../types/recording';
import { isDramaEpisode, type Track } from '../../types/track';
import { formatDateLabel, formatSpokenDate } from '../../utils/date';
import { ratio } from '../../utils/ratio';
import { formatDuration, hasKnownDuration } from '../../utils/time';

/** 快將下架嘅琥珀字（「05/12 下架」）同讀屏句；唔係就冇 */
export interface LeavingNote {
    text: string;
    label: string;
}

const leavingNote = (removedAt: string | undefined, today: string): LeavingNote | undefined =>
    removedAt && isLeavingSoon(removedAt, today)
        ? { text: removalWhen(removedAt, today, 'short'), label: spokenRemoval(removedAt) }
        : undefined;

/** 最近收聽一行（LR1）：嗰集快將下架（劇集；節目冇下架） */
export const trackLeaving = (track: Track, today: string): LeavingNote | undefined =>
    isDramaEpisode(track) ? leavingNote(track.removedAt, today) : undefined;

/**
 * 收藏咗嘅一集今日點（P8 #6）：成套劇或者嗰集已下架 → removed（灰色「已下架」行，進度唔刪）；
 * 快將下架就有 leaving（LB1）。catalog 保留已下架集數，所以搵得返嗰集嘅下架日
 */
export const bookmarkAvailability = (
    b: Bookmark,
    today: string,
): { removed: boolean; leaving?: LeavingNote } => {
    if (b.kind === 'show') return { removed: false };
    if (dramaStatus(b.dramaId, today) === 'removed') return { removed: true };
    const removedAt = catalogEpisodeOf(b.dramaId, b.id)?.removedAt;
    if (isRemoved(removedAt, today)) return { removed: true };
    const leaving = leavingNote(removedAt, today);
    return leaving ? { removed: false, leaving } : { removed: false };
};

/**
 * 收藏咗嘅一集 → player 播得嘅 Track：清單 / 劇集 catalog 有同一集（同一個 episode ID）就用返佢
 * （網址跟最新），冇就由收藏資料砌返
 */
export const bookmarkTrack = (b: Bookmark, recordings: readonly Recording[]): Track => {
    if (b.kind === 'show') {
        const { id, showId, date, time, url } = b;
        return recordings.find((r) => r.id === id) ?? { id, showId, date, time, url };
    }
    const known = dramaEpisodesOf(b.dramaId).find((e) => e.id === b.id);
    if (known) return known;
    const { id, dramaId, url } = b;
    return b.kind === 'daily'
        ? { kind: 'daily', id, dramaId, url, date: b.date, rerun: b.rerun }
        : {
              kind: 'series',
              id,
              dramaId,
              url,
              arc: b.arc,
              no: b.no,
              ...(b.title && { title: b.title }),
          };
};

/** 入邊頁（路徑 + 內頁把手用嘅 InnerPage） */
export interface EpisodePage {
    path: string;
    page: InnerPage;
}

const showPage = (showId: string): EpisodePage => ({
    path: `/show/${showId}`,
    page: { kind: 'show', showId },
});

const dramaPage = (dramaId: string): EpisodePage => ({
    path: `/drama/${dramaId}`,
    page: { kind: 'drama', dramaId },
});

/** 撳行入邊頁：節目 → 節目頁；劇集 → 劇集頁 */
export const bookmarkPage = (b: Bookmark): EpisodePage =>
    b.kind === 'show' ? showPage(b.showId) : dramaPage(b.dramaId);

/** 最近收聽撳行入邊頁 */
export const trackPage = (track: Track): EpisodePage =>
    isDramaEpisode(track) ? dramaPage(track.dramaId) : showPage(track.showId);

/** 行頭：節目 / 每日劇日子（17/10（六））；短篇劇集數 */
export const bookmarkLabel = (b: Bookmark): string =>
    b.kind === 'series' ? t('drama.episodeNo', { no: b.no }) : formatDateLabel(b.date);

/** 行嘅讀屏名用：日子讀「17/10 星期六」（A3）；短篇劇集數同畫面一樣 */
export const bookmarkSpokenLabel = (b: Bookmark): string =>
    b.kind === 'series' ? t('drama.episodeNo', { no: b.no }) : formatSpokenDate(b.date);

/** 短篇劇名（B3）：「芝See菇Bi Family · 三十六計」 */
export const seriesName = (title: string, arc: string): string =>
    t('bookmark.seriesName', { title, arc });

/** 短篇劇名讀屏版（S-716）：「芝See菇Bi Family，三十六計」，唔讀「·」 */
export const seriesSpokenName = (title: string, arc: string): string =>
    t('bookmark.seriesSpokenName', { title, arc });

/** 節目 / 劇仲喺 app 度（停用咗嘅劇入唔到頁，當冇） */
export const isKnownBookmark = (b: Bookmark): boolean =>
    b.kind === 'show'
        ? findShow(b.showId) !== undefined
        : findEnabledDrama(b.dramaId) !== undefined;

interface RowStatusInput {
    /** player 載入緊呢集 */
    loaded: boolean;
    isPlaying: boolean;
    live: { currentTime: number; duration: number } | undefined;
    progress: Progress | undefined;
}

export interface SavedRowStatus {
    text: string;
    /** 進度線 0–1 */
    ratio: number;
    /** 播緊：「播放中」紅 pill + 左邊紅條、掣變 ⏸ */
    playing: boolean;
    /** player 載入緊呢集（播緊 / 暫停都係）：暫停就左邊灰條 */
    current: boolean;
    /** 播緊而且知道時長：「播放中」pill + 紅條；連線中（未知時長，S-730）同暫停一樣灰條 */
    onAir: boolean;
}

const positionText = (position: number, duration: number): string =>
    hasKnownDuration(duration)
        ? t('common.status.resumeOf', {
              current: formatDuration(position),
              total: formatDuration(duration),
          })
        : t('common.status.resume', { time: formatDuration(position) });

/** 收藏 tab 每行右邊嘅字同進度線：播放中 / 聽到 x / y / 已收聽 / 未收聽（暫停緊都係聽到 x / y，A2） */
export const savedRowStatus = ({ loaded, isPlaying, live, progress }: RowStatusInput) => {
    if (loaded && live && !hasKnownDuration(live.duration)) {
        // S-730：同集數清單一樣，未知時長寫「連線中…」、唔出 pill；掣照跟 isPlaying
        const text = t('episodes.connecting');
        return { text, ratio: 0, playing: isPlaying, current: true, onAir: false };
    }
    if (loaded && live) {
        const shown = ratio(live.currentTime, live.duration);
        const text = isPlaying
            ? t('common.status.playing')
            : positionText(live.currentTime, live.duration);
        return { text, ratio: shown, playing: isPlaying, current: true, onAir: isPlaying };
    }
    const idle = { playing: false, current: false, onAir: false };
    if (progress?.watched) return { text: t('common.status.watched'), ratio: 1, ...idle };
    if (progress && progress.position > 0) {
        const shown = ratio(progress.position, progress.duration);
        return {
            text: positionText(progress.position, progress.duration),
            ratio: shown,
            ...idle,
        };
    }
    return { text: t('common.status.unwatched'), ratio: 0, ...idle };
};

/** box 頂 banner：節目 / 成套劇嘅橫圖同名（isKnownBookmark 過咗先用，搵唔到就空） */
export const boxMeta = (kind: 'show' | 'drama', id: string): { title: string; banner: string } => {
    const found = kind === 'show' ? findShow(id) : findEnabledDrama(id);
    return { title: found?.name ?? '', banner: found?.tileArt ?? '' };
};

/** 段左邊嘅碟：節目碟；劇集用嗰集嘅碟（短篇有自己碟就用，冇就成套劇嘅碟） */
export const trackArt = (track: Track): string =>
    isDramaEpisode(track) ? dramaArtFor(track) : themeFor(track.showId).art;

interface RecentText {
    name: string;
    /** 畫面細字：17/10（六）或者「短篇 · 第 N 集」 */
    label: string;
    /** 讀屏用：日子讀「17/10 星期六」（A3）；短篇「短篇，第 N 集」（S-717） */
    spokenLabel: string;
}

const dated = (name: string, date: string): RecentText => ({
    name,
    label: formatDateLabel(date),
    spokenLabel: formatSpokenDate(date),
});

/** 最近收聽一行嘅名同細字：節目 / 劇名；日子或者「短篇 · 第 N 集」 */
export const recentText = (track: Track): RecentText => {
    if (!isDramaEpisode(track)) return dated(findShow(track.showId)?.name ?? '', track.date);
    const name = findEnabledDrama(track.dramaId)?.name ?? '';
    if (track.kind !== 'series') return dated(name, track.date);
    const { arc, no } = track;
    return {
        name,
        label: t('drama.seriesLabelUntitled', { arc, no }),
        // 讀屏唔讀「·」（S-717）
        spokenLabel: t('drama.seriesLabelUntitled', { arc, no, sep: t('common.spokenSeparator') }),
    };
};

/** 最近收聽認得嘅集：錄音清單 + 開咗嘅劇嘅全部集數（episode ID → 集） */
export const playableIndex = (recordings: readonly Recording[]): ReadonlyMap<string, Track> =>
    new Map<string, Track>([
        ...recordings.map((r) => [r.id, r] as const),
        ...enabledDramas().flatMap((d) => dramaEpisodesOf(d.id).map((e) => [e.id, e] as const)),
    ]);
