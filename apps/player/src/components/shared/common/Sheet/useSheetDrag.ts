import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useBox } from '../../../../hooks/useBox';
import { bindElements, useSheetDragControls, type SheetElements } from './useSheetDragControls';
import { useListTouchDrag } from './useListTouchDrag';
import { useSheetPointerDrag } from './useSheetPointerDrag';

/**
 * 表（全集 ArcSheet / 資料 ItemInfoSheet）向下拉閂（直版、橫版 docked 一樣）：清單以外（grab bar / header）隨時拉得；
 * 清單捲到頂再向下拉都得。返回掛喺表 / 遮罩 / 清單嘅 callback ref 同埋表嘅 pointer handlers
 */
export const useSheetDrag = (open: boolean, onClose: () => void) => {
    const elements = useBox<SheetElements>({ sheet: null, backdrop: null, list: null }).current;
    const controls = useSheetDragControls(elements, onClose);
    // 表閂咗（Escape / ✕ / 拉走）或者再開：清走未完嘅手勢同閂表計時，唔會閂兩次 / 重開即刻跟住拉
    useEffect(() => controls.reset, [open, controls]);
    // W-777：收埋緊（同一粒 DOM）再開要清走拉走留低嘅 transform / data-closing / 遮罩 opacity；
    // layout effect = paint 之前，唔會閃一格畫面外嘅表。閂嗰陣唔清：sheet-out 由拉到嘅位繼續落
    useLayoutEffect(() => {
        if (open) controls.clearLeftovers();
    }, [open, controls]);
    useListTouchDrag(elements, open, controls);
    const handlers = useSheetPointerDrag(elements, open, controls);
    const refs = useMemo(() => bindElements(elements), [elements]);
    return { ...refs, handlers };
};
