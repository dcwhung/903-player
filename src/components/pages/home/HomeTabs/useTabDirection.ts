import { useState } from 'react';

/** 膠囊向邊邊郁：決定邊一邊係後面、要遲啲跟（HomeTabs.module.css） */
export type TabDirection = 'left' | 'right';

interface Tracked<T> {
    tab: T;
    direction?: TabDirection;
}

/**
 * 記住上一個 tab，換 tab 嗰次 render 就計出方向（render 期間 setState，唔使等 effect，
 * 膠囊同一次 style 更新就攞到啱嘅 transition）。第一次 render（包括返主頁重新 mount）冇方向，所以唔會郁
 */
export const useTabDirection = <T>(tab: T, order: readonly T[]): TabDirection | undefined => {
    const [tracked, setTracked] = useState<Tracked<T>>({ tab });
    if (tracked.tab !== tab) {
        const direction = order.indexOf(tab) > order.indexOf(tracked.tab) ? 'right' : 'left';
        setTracked({ tab, direction });
        return direction;
    }
    return tracked.direction;
};
