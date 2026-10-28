import { useSyncExternalStore } from 'react';
import type { ShowId } from '../types/recording';

/**
 * 邊個節目嘅集數係用戶自己喺節目頁揀（日子條 / 集數清單）：只有呢個節目嘅舊集先算「重溫」，
 * 返主頁照播；節目頁自動播嘅舊集唔算，返主頁會停。記節目唔記集數，自動接集都仲算用戶揀。
 * 存喺 module（同 miniPlayerDismissed 一樣），重開 app 就 reset
 */
let picked: ShowId | null = null;
const listeners = new Set<() => void>();

const setPicked = (value: ShowId | null) => {
    if (picked === value) return;
    picked = value;
    listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const getSnapshot = () => picked;

/** 用戶喺節目頁揀咗呢個節目嘅一集 */
export const markShowPicked = (showId: ShowId) => setPicked(showId);

/** 節目頁自動播：之後載入嘅唔再算用戶揀 */
export const clearShowPick = () => setPicked(null);

/** 而家嘅值（effect / handler 入面用，唔使 subscribe） */
export const pickedShow = (): ShowId | null => picked;

export const usePickedShow = (): ShowId | null =>
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
