import { useEffect } from 'react';
import { LOCK_SCREEN_SKIP_SECONDS } from '../config/constants';
import { findDrama } from '../dramas';
import { findShow } from '../config/shows';
import { dramaEpisodeLabel } from '../selectors/dramas';
import { isDramaEpisode, type Track } from '../types/track';
import { formatDateLabel } from '../utils/date';
import type { PlayerActions, PlayerState } from './playerContext';

const hasMediaSession = (): boolean => 'mediaSession' in navigator;

/** 鎖屏顯示：節目名 + 日子；廣播劇係劇名 + 集數（短篇 / 日子） */
const trackMetadata = (track: Track): MediaMetadataInit =>
    isDramaEpisode(track)
        ? { title: findDrama(track.dramaId)?.name ?? '', artist: dramaEpisodeLabel(track) }
        : { title: findShow(track.showId)?.name ?? '', artist: formatDateLabel(track.date) };

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
            navigator.mediaSession.metadata = new MediaMetadata(trackMetadata(recording));
        }
    }, [recording]);

    useEffect(() => {
        if (hasMediaSession()) {
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        }
    }, [isPlaying]);
};
