import { useEffect, useRef } from 'react';
import {
    MEDIA_POSITION_DRIFT_SECONDS,
    MEDIA_SESSION_PLAYBACK_RATE,
    MS_PER_SECOND,
} from '../config/constants';
import type { PlayerState } from './playerContext';

/** 對上一次報畀鎖屏嘅位置 */
interface Published {
    position: number;
    at: number;
    playbackState: MediaSessionPlaybackState;
    duration: number;
    url: string | undefined;
}

/** 鎖屏而家應該顯示緊嘅位置：playing 時 iOS 自己按時間推前 */
const expectedPosition = (last: Published, now: number): number =>
    last.playbackState === 'playing'
        ? last.position + (now - last.at) / MS_PER_SECOND
        : last.position;

/** 狀態 / 長度 / 集數變咗，或者位置同鎖屏推算嘅差太遠（seek）先要再報 */
const needsPublish = (last: Published | undefined, next: Published): boolean =>
    !last ||
    last.playbackState !== next.playbackState ||
    last.duration !== next.duration ||
    last.url !== next.url ||
    Math.abs(next.position - expectedPosition(last, next.at)) > MEDIA_POSITION_DRIFT_SECONDS;

/** 舊 Safari 冇 setPositionState；長度未知 / 直播（Infinity）唔報，位置唔可以超過長度 */
const setPositionState = (duration: number, position: number): void => {
    const { mediaSession } = navigator;
    const knownLength = Number.isFinite(duration) && duration > 0;
    if (typeof mediaSession.setPositionState !== 'function' || !knownLength) {
        return;
    }
    mediaSession.setPositionState({
        duration,
        position: Math.min(Math.max(0, position), duration),
        playbackRate: MEDIA_SESSION_PLAYBACK_RATE,
    });
};

/**
 * 將真正位置報畀鎖屏（S-551）：出聲 / 停 / 卡住 / seek 嗰下報一次，平時唔使逐下 timeupdate 報
 * （playing 時 iOS 自己推算）。卡住時位置凍結 + paused，鎖屏進度條就唔會自己行
 */
export const useMediaPosition = (
    state: PlayerState,
    playbackState: MediaSessionPlaybackState,
): void => {
    const last = useRef<Published | undefined>(undefined);
    const { currentTime, duration, recording } = state;

    useEffect(() => {
        if (!('mediaSession' in navigator)) {
            return;
        }
        const next: Published = {
            position: currentTime,
            at: Date.now(),
            playbackState,
            duration,
            url: recording?.url,
        };
        if (needsPublish(last.current, next)) {
            last.current = next;
            setPositionState(duration, currentTime);
        }
    }, [currentTime, duration, recording, playbackState]);
};
