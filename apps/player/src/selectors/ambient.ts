import type { ShowTheme } from '@903-player/catalog';
import { dramaArtFor } from '../catalog/dramas';
import { themeFor } from '../catalog/shows';
import { t } from '../i18n/t';
import { isDramaEpisode, type Track } from '../types/track';
import { formatDateLabel } from '../utils/date';
import { ratio } from '../utils/ratio';
import { hasKnownDuration } from '../utils/time';
import { dramaEpisodeLabel } from './dramas';
import { trackView, type HandleStatus } from './pageHandle';

export interface AmbientInput {
    /** player 載入咗嘅嘢（usePlayer().recording） */
    track: Track | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
}

/** 閒置畫面（9b）顯示乜 */
export interface AmbientView {
    name: string;
    /** 底色跟播緊節目 / 廣播劇色調 */
    theme: ShowTheme;
    /** 唱片碟面 */
    art: string;
    /** 節目「17/10（六）」；劇集「短篇 · 第 N 集」/ 日子；直播「直播」 */
    subtitle: string;
    status: HandleStatus;
    /** 進度圈 0–1；直播或者未知長度（metadata 未到）係 null，唔出圈 */
    progress: number | null;
    /** 直播（串流，duration Infinity）：唱片擺正唔轉、唔出進度圈 */
    live: boolean;
}

/** 直播 = 串流（duration Infinity）：唱片擺正唔轉、唔出進度圈、副題「直播」 */
const isLive = (duration: number): boolean => duration === Number.POSITIVE_INFINITY;

/**
 * 進度圈：直播冇；metadata 未到（0 / NaN）都未有圈，但唔當直播，副題照出集數 / 日子
 * （hasKnownDuration 當 Infinity 讀到，所以直播要先睇）
 */
const progressOf = (currentTime: number, duration: number): number | null =>
    isLive(duration) || !hasKnownDuration(duration) ? null : ratio(currentTime, duration);

/** 唱片：節目碟；劇集用嗰集嘅碟（短篇有自己碟就用，冇就成套劇嘅碟），同最近收聽一樣 */
const artOf = (track: Track): string =>
    isDramaEpisode(track) ? dramaArtFor(track) : themeFor(track.showId).art;

const episodeLabel = (track: Track): string =>
    isDramaEpisode(track) ? dramaEpisodeLabel(track) : formatDateLabel(track.date);

/** 閒置畫面資料；冇嘢載住就 null（N3：唔轉） */
export const ambientView = ({
    track,
    isPlaying,
    currentTime,
    duration,
}: AmbientInput): AmbientView | null => {
    if (!track) return null;
    const live = isLive(duration);
    return {
        ...trackView(track, isPlaying),
        art: artOf(track),
        subtitle: live ? t('ambient.live') : episodeLabel(track),
        progress: progressOf(currentTime, duration),
        live,
    };
};

export interface AmbientEligibility {
    /** player 有嘢載住（播緊或者暫停住一集） */
    hasTrack: boolean;
    /** 主頁 mini player 畀用戶左滑關咗（useMiniPlayerDismissed）：當冇播嘢 */
    miniPlayerDismissed: boolean;
    /** 有 modal dialog 開緊（休眠選單、清單 sheet 等，見 hasOpenModalDialog） */
    modalOpen: boolean;
}

/** 可唔可以轉閒置畫面：有嘢載住、mini player 冇撥走、冇 modal 開緊（用戶 2026-11-20） */
export const canShowAmbient = ({
    hasTrack,
    miniPlayerDismissed,
    modalOpen,
}: AmbientEligibility): boolean => hasTrack && !miniPlayerDismissed && !modalOpen;
