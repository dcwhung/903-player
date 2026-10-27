import { useEffect, useMemo } from 'react';
import { useBox } from '../../hooks/useBox';
import { bindElements, useSheetDragControls, type SheetElements } from './sheetDragCore';
import { useListTouchDrag } from './useListTouchDrag';
import { useSheetPointerDrag } from './useSheetPointerDrag';

/**
 * 全集表向下拉閂（直版、橫版 docked 一樣）：清單以外（grab bar / header）隨時拉得；
 * 清單捲到頂再向下拉都得。返回掛喺表 / 遮罩 / 清單嘅 callback ref 同埋表嘅 pointer handlers
 */
export const useSheetDrag = (open: boolean, onClose: () => void) => {
    const elements = useBox<SheetElements>({ sheet: null, backdrop: null, list: null }).current;
    const controls = useSheetDragControls(elements, onClose);
    // 表閂咗（Escape / ✕ / 拉走）或者再開：清走未完嘅手勢同閂表計時，唔會閂兩次 / 重開即刻跟住拉
    useEffect(() => controls.reset, [open, controls]);
    useListTouchDrag(elements, open, controls);
    const handlers = useSheetPointerDrag(elements, open, controls);
    const refs = useMemo(() => bindElements(elements), [elements]);
    return { ...refs, handlers };
};
