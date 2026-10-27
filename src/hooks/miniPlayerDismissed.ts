import { useSyncExternalStore } from 'react';

/**
 * 主頁 mini player 畀用戶左滑關閉咗未：存喺 module（唔係 component state），
 * 去節目頁再返主頁（HomePage 重新 mount）都記得；重開 app 就 reset，唔記落 localStorage
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
