import { useState } from 'react';

/**
 * HomeView 清單 sheet 開 / 閂（P10 lane 6）：頁頭清單掣 toggle，✕ / 遮罩 / Escape / 拉走 close。
 * 由「我的收藏」撳行入嚟（focusKey）：清單收埋就見唔到嗰集，所以有新嘅 focusKey 就自動打開
 */
export const useListSheet = (focusKey: string | undefined) => {
    const [open, setOpen] = useState(false);
    const [seenFocus, setSeenFocus] = useState<string | undefined>(undefined);
    // render 期間跟 focusKey 轉（React 建議做法），唔使 effect
    if (focusKey !== undefined && focusKey !== seenFocus) {
        setSeenFocus(focusKey);
        setOpen(true);
    }
    return {
        open,
        toggle: () => setOpen((wasOpen) => !wasOpen),
        close: () => setOpen(false),
    };
};
