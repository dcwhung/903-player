import { useSyncExternalStore } from 'react';

export interface FlagStore {
    set: (value: boolean) => void;
    useValue: () => boolean;
}

/**
 * module 層面嘅一個開關（唔係 component state）：轉頁（例如主頁重新 mount）都記得；
 * 重開 app 就 reset，唔記落 localStorage。mini player 關閉、主頁播放卡收埋共用
 */
export const createFlagStore = (initial = false): FlagStore => {
    let value = initial;
    const listeners = new Set<() => void>();
    const subscribe = (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };
    const getSnapshot = () => value;
    return {
        set: (next) => {
            if (value === next) return;
            value = next;
            listeners.forEach((listener) => listener());
        },
        useValue: () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot),
    };
};
