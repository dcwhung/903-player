import { useCallback, useState } from 'react';
import { prefersReducedMotion } from '../../../../utils/motion';

interface SwapState<T> {
    shown: T;
    /** 淡出緊嘅舊版（淡完 onLeft 先拆） */
    leaving: T | null;
    /** 換過：新版要淡入（第一次顯示 / 減少動態唔淡） */
    swapped: boolean;
}

/**
 * 收藏 tab 有收藏版 ↔ 冇收藏版（_mockups_/qr-transfer ①）：換嗰刻先問減少動態（唔用之前 render 留低嘅值）；
 * 要動畫就保留舊版做 leaving（用最新資料畫，例如啱啱移除嗰集唔會彈返出嚟），新版淡入。
 * 減少動態 = 直接換，冇 leaving
 */
export const useModeSwap = <T>(mode: T) => {
    const [state, setState] = useState<SwapState<T>>({
        shown: mode,
        leaving: null,
        swapped: false,
    });
    let current = state;
    if (state.shown !== mode) {
        current = prefersReducedMotion()
            ? { shown: mode, leaving: null, swapped: false }
            : { shown: mode, leaving: state.shown, swapped: true };
        // render 期間跟住改 state（React「props 變就調整 state」寫法）
        setState(current);
    }
    const onLeft = useCallback(() => setState((s) => ({ ...s, leaving: null })), []);
    return { leaving: current.leaving, entering: current.swapped, onLeft };
};
