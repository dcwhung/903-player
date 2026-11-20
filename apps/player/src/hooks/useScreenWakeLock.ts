import { useEffect } from 'react';

const ignore = () => {};

/** 放 lock：已經放咗 / 失敗都唔理 */
const release = (sentinel: WakeLockSentinel | null) => {
    if (sentinel && !sentinel.released) sentinel.release().catch(ignore);
};

/**
 * 保持一個 screen wake lock：前台先 request；瀏覽器切走會自動放，返前台再 request。
 * 唔支援 / 被拒（例如省電模式）就靜靜忽略，跟系統熄屏。回傳停止函數
 */
const holdScreenWakeLock = (wakeLock: WakeLock): (() => void) => {
    let sentinel: WakeLockSentinel | null = null;
    let pending = false;
    let stopped = false;
    const request = () => {
        const held = sentinel !== null && !sentinel.released;
        if (stopped || pending || held || document.visibilityState !== 'visible') return;
        pending = true;
        const granted = (lock: WakeLockSentinel) => {
            pending = false;
            // 停咗先批出嚟：即刻放返
            if (stopped) release(lock);
            else sentinel = lock;
        };
        try {
            wakeLock.request('screen').then(granted, () => (pending = false));
        } catch {
            pending = false;
        }
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
        stopped = true;
        document.removeEventListener('visibilitychange', request);
        release(sentinel);
    };
};

/**
 * 閒置畫面（9b）用：active 時屏幕唔好自己熄（HomeView 有嘢載住先開，用戶 2026-11-20）；
 * inactive / unmount 就放返，冇 navigator.wakeLock 就乜都唔做
 */
export const useScreenWakeLock = (active: boolean): void => {
    useEffect(() => {
        if (!active || !('wakeLock' in navigator)) return undefined;
        return holdScreenWakeLock(navigator.wakeLock);
    }, [active]);
};
