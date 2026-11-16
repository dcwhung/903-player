import { useState } from 'react';
import type { ItemInfoSection } from '../selectors/itemInfo';

/**
 * 節目頁 / 每日劇頁嘅獨立資料 sheet（P9.5 #12）：autoOpenOnEntry = 第一次入要自動彈（入頁嗰下判斷一次）；
 * 冇資料就唔出 ⓘ、亦唔會開
 */
export const useItemInfoSheet = (
    sections: readonly ItemInfoSection[],
    autoOpenOnEntry: boolean,
    infoLabel: string,
) => {
    const [open, setOpen] = useState(autoOpenOnEntry);
    const hasInfo = sections.length > 0;
    return {
        sheet: { open: open && hasInfo, sections, label: infoLabel, close: () => setOpen(false) },
        gaugeInfo: hasInfo ? { onInfo: () => setOpen(true), infoLabel } : undefined,
    };
};

export type ItemInfoSheetView = ReturnType<typeof useItemInfoSheet>;
