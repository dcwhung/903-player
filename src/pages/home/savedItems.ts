import {
    dramaArtFor,
    dramaEpisodesOf,
    enabledDramas,
    findEnabledDrama,
} from '../../catalog/dramas';
import { findShow, themeFor } from '../../catalog/shows';
import { t } from '../../i18n/t';
import type { InnerPage } from '../../selectors/pageHandle';
import type { Bookmark } from '../../services/bookmarkStore';
import type { Progress } from '../../services/progressStore';
import type { Recording } from '../../types/recording';
import { isDramaEpisode, type Track } from '../../types/track';
import { formatDateLabel, formatSpokenDate } from '../../utils/date';
import { ratio } from '../../utils/ratio';
import { formatDuration, hasKnownDuration } from '../../utils/time';

/** 收藏咗嘅一集 → player 播得嘅 Track：清單 / 劇集 catalog 有同一個網址就用返佢，冇就由收藏資料砌返 */
export const bookmarkTrack = (b: Bookmark, recordings: readonly Recording[]): Track => {
    if (b.kind === 'show') {
        const { showId, date, time, url } = b;
        return recordings.find((r) => r.url === url) ?? { showId, date, time, url };
    }
    const known = dramaEpisodesOf(b.dramaId).find((e) => e.url === b.url);
    if (known) return known;
    const { dramaId, url } = b;
    return b.kind === 'daily'
        ? { kind: 'daily', dramaId, url, date: b.date, rerun: b.rerun }
        : {
              kind: 'series',
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
    t('bookmark.seriesName', { title, arc, sep: t('common.separator') });

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
    /** 播緊：行變深、字變 cream、掣變 ⏸ */
    playing: boolean;
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
    if (loaded && live) {
        const shown = ratio(live.currentTime, live.duration);
        const text = isPlaying
            ? t('common.status.playing')
            : positionText(live.currentTime, live.duration);
        return { text, ratio: shown, playing: isPlaying };
    }
    if (progress?.watched) return { text: t('common.status.watched'), ratio: 1, playing: false };
    if (progress && progress.position > 0) {
        const shown = ratio(progress.position, progress.duration);
        return {
            text: positionText(progress.position, progress.duration),
            ratio: shown,
            playing: false,
        };
    }
    return { text: t('common.status.unwatched'), ratio: 0, playing: false };
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
    /** 讀屏用：日子讀「17/10 星期六」（A3）；短篇同畫面一樣 */
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
    const label = t('drama.seriesLabelUntitled', { arc: track.arc, no: track.no });
    return { name, label, spokenLabel: label };
};

/** 最近收聽認得嘅集：錄音清單 + 開咗嘅劇嘅全部集數（網址 → 集） */
export const playableIndex = (recordings: readonly Recording[]): ReadonlyMap<string, Track> =>
    new Map<string, Track>([
        ...recordings.map((r) => [r.url, r] as const),
        ...enabledDramas().flatMap((d) => dramaEpisodesOf(d.id).map((e) => [e.url, e] as const)),
    ]);
