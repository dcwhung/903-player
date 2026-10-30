import type { MiniPlayerProps } from '../components/MiniPlayer/MiniPlayer';
import type { StandbyTime } from '../components/PlayerPanel/PlayerGauge';
import { useRecordings } from '../data/useRecordings';
import { useRefreshedOn } from '../hooks/useRefreshedOn';
import { usePlayer } from '../player/usePlayer';
import { dramaEpisodeLabel } from '../selectors/dramas';
import { getProgress, type Progress } from '../services/progressStore';
import type { Recording } from '../types/recording';
import { isDramaEpisode, type Track } from '../types/track';
import { formatDateLabel } from '../utils/date';
import { playbackStateOf, type PlaybackLineState } from '../utils/playbackState';
import { hasKnownDuration } from '../utils/time';

/** 主頁播放卡唱片格 + 「現正播放」要嘅嘢 */
export interface HomeCardGauge {
    /** 未載入顯示緊嗰集：唱片係未開始樣，撳播放先載入播放（同 mini player ▶ 一樣） */
    onStart: (() => void) | undefined;
    standbyTime: StandbyTime | undefined;
    /** 「現正播放：…」後面嘅字（日子 / 短篇 · 第 N 集 集名） */
    label: string;
    status: PlaybackLineState;
    connecting: boolean;
}

/** 顯示緊嗰集：載入咗就係 player 嗰集，否則喺清單搵（今日節目未播） */
const shownTrack = (
    url: string | undefined,
    loaded: Track | null,
    recordings: Recording[],
): Track | undefined =>
    loaded && loaded.url === url ? loaded : recordings.find((r) => r.url === url);

const trackLabel = (track: Track | undefined, fallback: string): string => {
    if (!track) return fallback;
    return isDramaEpisode(track) ? dramaEpisodeLabel(track) : formatDateLabel(track.date);
};

/** 聽到一半先有續播位置（同劇集頁 standbyTimeOf 一樣） */
const standbyOf = (progress: Progress | undefined): StandbyTime | undefined =>
    progress && !progress.watched
        ? { position: progress.position, duration: progress.duration }
        : undefined;

/**
 * 未載入：聽過講「繼續收聽」；未聽過同節目頁一樣講「現正播放」
 * （唔講「下一集」，免得同下面「下一集」清單撞名）
 */
const idleStatus = (standby: StandbyTime | undefined): PlaybackLineState =>
    standby ? 'resume' : 'playing';

/** 主頁播放卡顯示 mini player 揀中嗰集：載入咗就跟 player，否則係未開始樣（用存低嘅進度） */
export const useHomeCardGauge = (mini: MiniPlayerProps): HomeCardGauge => {
    const player = usePlayer();
    const { recordings } = useRecordings();
    const url = mini.keys[mini.index];
    const isLoaded = url !== undefined && player.recording?.url === url;
    const saved = useRefreshedOn(
        () => (url && !isLoaded ? getProgress(url) : undefined),
        [url, isLoaded, player.watchedRevision],
    );
    const standbyTime = standbyOf(saved);
    const { isPlaying, currentTime: position } = player;
    return {
        onStart: isLoaded ? undefined : mini.onToggle,
        standbyTime,
        label: trackLabel(shownTrack(url, player.recording, recordings), mini.subtitle),
        status: isLoaded ? playbackStateOf({ isPlaying, position }) : idleStatus(standbyTime),
        connecting: isLoaded && !hasKnownDuration(player.duration),
    };
};
