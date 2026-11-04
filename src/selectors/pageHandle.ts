import { dramaEpisodeTheme, findDrama } from '../catalog/dramas';
import { findShow, themeFor } from '../catalog/shows';
import type { ShowTheme } from '../config/showThemes';
import type { ClosedPlayerCard } from '../hooks/homePlayerCardClosed';
import type { DramaId } from '../types/drama';
import type { PlayerItem } from '../types/playerItem';
import type { ShowId } from '../types/recording';
import { isDramaEpisode, type Track } from '../types/track';

/** 有右邊把手嘅內頁：節目頁、劇集頁、今日節目頁 */
export type InnerPage =
    { kind: 'show'; showId: ShowId } | { kind: 'drama'; dramaId: DramaId } | { kind: 'today' };

/** 把手細字：播緊（主題強調色）定係暫停 / 閂咗（muted） */
export type HandleStatus = 'playing' | 'paused';

export interface PageHandleView {
    theme: ShowTheme;
    name: string;
    status: HandleStatus;
}

export interface PageHandleInput {
    /** player 載入咗嘅嘢（usePlayer().recording） */
    track: Track | null;
    isPlaying: boolean;
    /** 主頁撳 ✕ 閂咗嘅卡（停咗播，track 係 null） */
    closed: ClosedPlayerCard | null;
    page: InnerPage;
    /** 香港今日（hkToday），YYYY-MM-DD */
    today: string;
}

export const trackItem = (track: Track): PlayerItem =>
    isDramaEpisode(track)
        ? { kind: 'drama', id: track.dramaId }
        : { kind: 'show', id: track.showId, date: track.date };

/** 係咪呢頁自己嘅嘢：節目頁同一個節目、劇集頁同一套劇、今日節目頁今日嘅錄音 */
const belongsTo = (item: PlayerItem, page: InnerPage, today: string): boolean => {
    if (page.kind === 'today') return item.kind === 'show' && item.date === today;
    if (page.kind === 'show') return item.kind === 'show' && item.id === page.showId;
    return item.kind === 'drama' && item.id === page.dramaId;
};

const trackView = (track: Track, isPlaying: boolean): PageHandleView => {
    const status = isPlaying ? 'playing' : 'paused';
    if (isDramaEpisode(track)) {
        const name = findDrama(track.dramaId)?.name ?? '';
        return { theme: dramaEpisodeTheme(track), name, status };
    }
    return { theme: themeFor(track.showId), name: findShow(track.showId)?.name ?? '', status };
};

/**
 * 內頁右邊把手顯示乜：「而家嘅嘢」= player 載入咗嘅 track，冇就係主頁閂咗嘅卡；
 * 係呢頁自己嘅（或者乜都冇）就冇把手。閂咗嘅卡唔知係邊個（舊資料）就照出把手
 */
export const pageHandle = ({
    track,
    isPlaying,
    closed,
    page,
    today,
}: PageHandleInput): PageHandleView | null => {
    if (track) return belongsTo(trackItem(track), page, today) ? null : trackView(track, isPlaying);
    if (!closed) return null;
    if (closed.item && belongsTo(closed.item, page, today)) return null;
    return { theme: closed.theme, name: closed.showName, status: 'paused' };
};
