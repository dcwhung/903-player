import { useSyncExternalStore } from 'react';

export interface ValueStore<T> {
    set: (value: T) => void;
    useValue: () => T;
}

export type FlagStore = ValueStore<boolean>;

/**
 * module 層面嘅一個值（唔係 component state）：轉頁（例如主頁重新 mount）都記得；
 * 重開 app 就 reset，唔記落 localStorage。mini player 關閉、主頁播放卡收埋共用。
 * 同一個值（Object.is）就唔通知
 */
export const createValueStore = <T>(initial: T): ValueStore<T> => {
    let value = initial;
    const listeners = new Set<() => void>();
    const subscribe = (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };
    const getSnapshot = () => value;
    return {
        set: (next) => {
            if (Object.is(value, next)) return;
            value = next;
            listeners.forEach((listener) => listener());
        },
        useValue: () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot),
    };
};

/** 開關版（例如 mini player 畀用戶左滑關閉咗未） */
export const createFlagStore = (initial = false): FlagStore => createValueStore(initial);
