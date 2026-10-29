import { useEffect } from 'react';
import { LOCK_SCREEN_SKIP_SECONDS } from '../config/constants';
import { findDrama } from '../dramas';
import { findShow } from '../shows';
import { dramaEpisodeLabel } from '../selectors/dramas';
import { isDramaEpisode, type Track } from '../types/track';
import { formatDateLabel } from '../utils/date';
import type { PlayerActions, PlayerState } from './playerContext';
import { useMediaPosition } from './useMediaPosition';

/** 鎖屏 / 耳機專用嘅操作（唔放入 PlayerActions，app 入面唔使用） */
export interface RemoteControls {
    /** 鎖屏 Play：卡住時即刻重新載入再播 */
    resume: () => Promise<void>;
    /** 記低鎖屏操作落播放 log */
    log: (action: string, note?: string) => void;
}

const hasMediaSession = (): boolean => 'mediaSession' in navigator;

/** 鎖屏顯示：節目名 + 日子；廣播劇係劇名 + 集數（短篇 / 日子） */
const trackMetadata = (track: Track): MediaMetadataInit =>
    isDramaEpisode(track)
        ? { title: findDrama(track.dramaId)?.name ?? '', artist: dramaEpisodeLabel(track) }
        : { title: findShow(track.showId)?.name ?? '', artist: formatDateLabel(track.date) };

const bindActions = (
    mediaSession: MediaSession,
    actions: PlayerActions,
    remote: RemoteControls | undefined,
): void => {
    const play = remote?.resume ?? actions.play;
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
        play: () => void play(),
        pause: () => actions.pause(),
        seekbackward: () => actions.skip(-LOCK_SCREEN_SKIP_SECONDS),
        seekforward: () => actions.skip(LOCK_SCREEN_SKIP_SECONDS),
        seekto: (details) => actions.seek(details.seekTime ?? 0),
    };
    Object.entries(handlers).forEach(([action, handler]) =>
        mediaSession.setActionHandler(action as MediaSessionAction, (details) => {
            // 鎖屏操作記入 log（S-551：要知用戶喺鎖屏撳過乜）
            const seekTo = details.seekTime === undefined ? undefined : `to=${details.seekTime}`;
            remote?.log(`ms:${action}`, seekTo);
            handler(details);
        }),
    );
};

/** 鎖屏 / 控制中心顯示節目資料，並將按鈕接駁到 player */
export const useMediaSession = (
    actions: PlayerActions,
    state: PlayerState,
    remote?: RemoteControls,
): void => {
    const { recording, isPlaying, isAudible } = state;
    // 播緊但未出聲（載緊 / 卡住）報 paused：iOS 先唔會自己推進度條，鎖屏亦會顯示 Play（S-551）
    const playbackState: MediaSessionPlaybackState = isPlaying && isAudible ? 'playing' : 'paused';

    useEffect(() => {
        if (hasMediaSession()) {
            bindActions(navigator.mediaSession, actions, remote);
        }
    }, [actions, remote]);

    useEffect(() => {
        if (hasMediaSession() && recording) {
            navigator.mediaSession.metadata = new MediaMetadata(trackMetadata(recording));
        }
    }, [recording]);

    useEffect(() => {
        if (hasMediaSession()) {
            navigator.mediaSession.playbackState = playbackState;
        }
    }, [playbackState]);

    useMediaPosition(state, playbackState);
};
