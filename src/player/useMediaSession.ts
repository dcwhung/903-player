import { useEffect } from 'react';
import { SKIP_BACK_SECONDS, SKIP_FORWARD_SECONDS } from '../config/constants';
import { findShow } from '../config/shows';
import { formatDateLabel } from '../utils/date';
import type { PlayerContextValue } from './playerContext';

// 鎖屏 / 耳機只有一粒前後掣，用較短嗰個跳秒值
const LOCK_SCREEN_SKIP_SECONDS = Math.min(...SKIP_BACK_SECONDS, ...SKIP_FORWARD_SECONDS);

const bindActions = (mediaSession: MediaSession, player: PlayerContextValue): void => {
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
        play: () => void player.toggle(),
        pause: () => void player.toggle(),
        seekbackward: () => player.skip(-LOCK_SCREEN_SKIP_SECONDS),
        seekforward: () => player.skip(LOCK_SCREEN_SKIP_SECONDS),
        seekto: (details) => player.seek(details.seekTime ?? 0),
    };
    Object.entries(handlers).forEach(([action, handler]) =>
        mediaSession.setActionHandler(action as MediaSessionAction, handler),
    );
};

/** 鎖屏 / 控制中心顯示節目資料，並將按鈕接駁到 player */
export const useMediaSession = (player: PlayerContextValue): void => {
    const { recording, isPlaying } = player;

    useEffect(() => {
        if (!('mediaSession' in navigator) || !recording) {
            return;
        }
        navigator.mediaSession.metadata = new MediaMetadata({
            title: findShow(recording.showId)?.name ?? '',
            artist: formatDateLabel(recording.date),
        });
    }, [recording]);

    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
            bindActions(navigator.mediaSession, player);
        }
    }, [player, isPlaying]);
};
