import { useCallback, useState } from 'react';
import { prefersReducedMotion } from '../utils/motion';

export interface FadeOutOptions {
    /** false = 唔淡出，即刻冇（例如轉出闊橫版：把手連預留位要即刻收，S-665）；預設 true */
    fade?: boolean;
}

/**
 * 值變咗 null 時唔即刻冇：保留最後顯示嘅值（leaving），等淡出動畫完（onLeft）先拆走；
 * 減少動畫或者 fade: false 就即刻冇。keyOf 用嚟判斷顯示緊嘅嘢有冇變（每次 render 新 object 都唔會當變咗）
 */
export const useFadeOut = <T>(
    value: T | null,
    keyOf: (value: T) => string,
    { fade = true }: FadeOutOptions = {},
) => {
    const [last, setLast] = useState<T | null>(value);
    const canFade = fade && !prefersReducedMotion();
    // render 期間跟住改 state（React 建議嘅做法，唔使 effect）：記低最後顯示嘅值畀淡出用
    if (value !== null && (last === null || keyOf(last) !== keyOf(value))) setLast(value);
    // 唔淡出就連記低嘅值都清走，之後先唔會無端端淡出一個舊值
    if (value === null && last !== null && !canFade) setLast(null);
    const leaving = value === null && last !== null && canFade;
    // setLast 唔會變：onLeft 保持同一個 function，畀 effect 做 dependency 都唔會重掛
    const onLeft = useCallback(() => setLast(null), []);
    return { shown: value ?? (leaving ? last : null), leaving, onLeft };
};
