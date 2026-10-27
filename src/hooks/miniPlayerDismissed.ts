import { useEffect, useRef, useSyncExternalStore } from 'react';
import { usePlayer } from '../player/usePlayer';

/**
 * 主頁 mini player 畀用戶左滑關閉咗未：存喺 module（唔係 component state），
 * 去節目頁再返主頁（HomePage 重新 mount）都記得；重開 app 就 reset，唔記落 localStorage。
 * 清走（再出返）由 App 層面嘅 useRestoreMiniPlayerOnPlay 負責，喺邊一頁開始播都得
 */
let dismissed = false;
const listeners = new Set<() => void>();

const setDismissed = (value: boolean) => {
    if (dismissed === value) return;
    dismissed = value;
    listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const getSnapshot = () => dismissed;

/** 用戶左滑關閉：收起 mini player */
export const dismissMiniPlayer = () => setDismissed(true);

/** 再出返（例如開始播嘢） */
export const restoreMiniPlayer = () => setDismissed(false);

export const useMiniPlayerDismissed = (): boolean =>
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/**
 * App 層面掛一次（PlayerProvider 入面）：喺任何一頁開始播（isPlaying 由 false 變 true）就再出返 mini player。
 * 睇「變 true」而唔係「係 true」：真 audio 嘅 pause 遲啲先到，關閉嗰下 isPlaying 可能仲係 true
 */
export const useRestoreMiniPlayerOnPlay = () => {
    const { isPlaying } = usePlayer();
    const wasPlaying = useRef(isPlaying);
    useEffect(() => {
        if (isPlaying && !wasPlaying.current) restoreMiniPlayer();
        wasPlaying.current = isPlaying;
    }, [isPlaying]);
};
