import { useRef, useState } from 'react';
import type { InfoBanner, ItemInfoSection } from '../selectors/itemInfo';

/**
 * 節目頁 / 每日劇頁嘅獨立資料 sheet（P9.5 #12）：autoOpenOnEntry = 第一次入要自動彈（入頁嗰下判斷一次）；
 * 冇資料就唔出 ⓘ、亦唔會開。自動彈冇撳過掣：閂咗焦點返 ⓘ（infoRef，用戶 2026-11-18 決定），唔好跌去 <body>
 */
export const useItemInfoSheet = (
    sections: readonly ItemInfoSection[],
    autoOpenOnEntry: boolean,
    infoLabel: string,
    /** 頂部 banner（P9.5 #12 v3）；冇圖就冇 */
    banner?: InfoBanner,
) => {
    const [open, setOpen] = useState(autoOpenOnEntry);
    // ⓘ 喺唱片圈（直版 / 橫版 / Duo）或者頁頭（HomeView），同一時間只有一粒
    const infoRef = useRef<HTMLButtonElement>(null);
    const hasInfo = sections.length > 0;
    return {
        sheet: {
            open: open && hasInfo,
            sections,
            banner,
            label: infoLabel,
            close: () => setOpen(false),
            returnFocusTo: infoRef,
        },
        gaugeInfo: hasInfo ? { onInfo: () => setOpen(true), infoLabel, infoRef } : undefined,
    };
};

export type ItemInfoSheetView = ReturnType<typeof useItemInfoSheet>;
