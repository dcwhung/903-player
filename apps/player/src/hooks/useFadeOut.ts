import { useCallback, useState } from 'react';
import { prefersReducedMotion } from '../utils/motion';

export interface FadeOutOptions {
    /** false = 唔淡出，即刻冇（例如轉出闊橫版：把手要即刻收，預留位跟闊橫版 media query 一齊冇，S-665）；預設 true */
    fade?: boolean;
}

interface FadeState<T> {
    /** 最後顯示嘅值，淡出期間照顯示 */
    last: T | null;
    /** 已經決定咗淡出（離開嗰刻決定，之後唔再改，S-668） */
    fading: boolean;
}

const cleared = <T>(): FadeState<T> => ({ last: null, fading: false });

/** 呢次 render 之後嘅 state；冇變就回傳原本嗰個（唔會觸發多一次 render） */
const nextState = <T>(
    state: FadeState<T>,
    value: T | null,
    keyOf: (value: T) => string,
    fade: boolean,
): FadeState<T> => {
    if (value !== null) {
        const same = state.last !== null && keyOf(state.last) === keyOf(value);
        return same && !state.fading ? state : { last: value, fading: false };
    }
    if (state.last === null) return state;
    if (!fade) return cleared();
    if (state.fading) return state;
    // 啱啱離開：呢刻先問減少動畫（同 app 其他 JS 動畫一樣即時讀，唔用之前 render 留低嘅值）
    return prefersReducedMotion() ? cleared() : { ...state, fading: true };
};

/**
 * 值變咗 null 時唔即刻冇：保留最後顯示嘅值（leaving），等淡出動畫完（onLeft）先拆走；
 * 離開嗰刻係減少動畫或者 fade: false 就即刻冇。淡出途中先轉減少動畫：CSS 嘅 media query 停咗個動畫，
 * 由 PlayerHandle 嘅 animationcancel / 後備 timer 叫 onLeft（S-666）。
 * keyOf 用嚟判斷顯示緊嘅嘢有冇變（每次 render 新 object 都唔會當變咗）
 */
export const useFadeOut = <T>(
    value: T | null,
    keyOf: (value: T) => string,
    { fade = true }: FadeOutOptions = {},
) => {
    const [state, setState] = useState<FadeState<T>>({ last: value, fading: false });
    const next = nextState(state, value, keyOf, fade);
    // render 期間跟住改 state（React 建議嘅做法，唔使 effect）
    if (next !== state) setState(next);
    const leaving = value === null && next.fading;
    // setState 唔會變：onLeft 保持同一個 function，畀 effect 做 dependency 都唔會重掛
    const onLeft = useCallback(() => setState(cleared()), []);
    return { shown: value ?? (leaving ? next.last : null), leaving, onLeft };
};
