import { useState } from 'react';
import { prefersReducedMotion } from '../utils/motion';

/**
 * 值變咗 null 時唔即刻冇：保留最後顯示嘅值（leaving），等淡出動畫完（onLeft）先拆走；
 * 減少動畫就即刻冇。keyOf 用嚟判斷顯示緊嘅嘢有冇變（每次 render 新 object 都唔會當變咗）
 */
export const useFadeOut = <T>(value: T | null, keyOf: (value: T) => string) => {
    const [last, setLast] = useState<T | null>(value);
    // render 期間跟住改 state（React 建議嘅做法，唔使 effect）：記低最後顯示嘅值畀淡出用
    if (value !== null && (last === null || keyOf(last) !== keyOf(value))) setLast(value);
    const leaving = value === null && last !== null && !prefersReducedMotion();
    return {
        shown: value ?? (leaving ? last : null),
        leaving,
        onLeft: () => setLast(null),
    };
};
