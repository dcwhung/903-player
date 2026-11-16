import { useLayoutEffect, useState } from 'react';

/** 記住一個值但改佢唔會觸發 render：只喺 commit（layout effect）寫，render 讀到嘅一定係已 commit 嘅值 */
interface Latch<T> {
    get: () => T;
    set: (next: T) => void;
}

const createLatch = <T>(initial: T): Latch<T> => {
    let latched = initial;
    return {
        get: () => latched,
        set: (next) => {
            latched = next;
        },
    };
};

/**
 * 表收埋緊（useSheetPresence 'closing'）用返最後一次開住時嘅值：
 * 有啲父層閂表嗰下就清走內容（例如短篇資料 sheet 嘅 sections），滑走途中唔可以變空白
 */
export const useHeldWhileClosing = <T>(value: T, open: boolean): T => {
    const [latch] = useState(() => createLatch(value));
    // S-1094：開住時 commit 先記低（唔用 state）：播放中父層每秒傳新 array，唔會喺 render 期間 set state
    // 再 render 多一次。閂嗰次 render 讀到嘅係上一次開住 commit 咗嘅值；冇 commit 嘅 render 唔會寫入
    useLayoutEffect(() => {
        if (open) latch.set(value);
    }, [latch, open, value]);
    return open ? value : latch.get();
};
