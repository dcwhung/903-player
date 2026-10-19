import { useEffect } from 'react';
import { SKIP_BACK_SECONDS, SKIP_FORWARD_SECONDS } from '../config/constants';
import { findShow } from '../config/shows';
import { formatDateLabel } from '../utils/date';
import type { PlayerActions, PlayerState } from './playerContext';

// 鎖屏 / 耳機只有一粒前後掣，用較短嗰個跳秒值
const LOCK_SCREEN_SKIP_SECONDS = Math.min(...SKIP_BACK_SECONDS, ...SKIP_FORWARD_SECONDS);

const hasMediaSession = (): boolean => 'mediaSession' in navigator;

const bindActions = (mediaSession: MediaSession, actions: PlayerActions): void => {
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
        play: () => void actions.play(),
        pause: () => actions.pause(),
        seekbackward: () => actions.skip(-LOCK_SCREEN_SKIP_SECONDS),
        seekforward: () => actions.skip(LOCK_SCREEN_SKIP_SECONDS),
        seekto: (details) => actions.seek(details.seekTime ?? 0),
    };
    Object.entries(handlers).forEach(([action, handler]) =>
        mediaSession.setActionHandler(action as MediaSessionAction, handler),
    );
};

/** 鎖屏 / 控制中心顯示節目資料，並將按鈕接駁到 player */
export const useMediaSession = (actions: PlayerActions, state: PlayerState): void => {
    const { recording, isPlaying } = state;

    useEffect(() => {
        if (hasMediaSession()) {
            bindActions(navigator.mediaSession, actions);
        }
    }, [actions]);

    useEffect(() => {
        if (hasMediaSession() && recording) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: findShow(recording.showId)?.name ?? '',
                artist: formatDateLabel(recording.date),
            });
        }
    }, [recording]);

    useEffect(() => {
        if (hasMediaSession()) {
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        }
    }, [isPlaying]);
};
