import { useEffect, type PointerEvent } from 'react';
import { useBox, type Box } from '../../hooks/useBox';
import { DRAG_INTENT_PX } from '../../hooks/swipe';
import { isLostRelease } from '../../hooks/lostRelease';
import { useClickSuppression } from '../../hooks/useSwipe';
import type { GetElement, SheetDragControls, SheetElements } from './useSheetDragControls';

interface PointerGesture {
    pointerId: number;
    startY: number;
    /** 拉過 DRAG_INTENT_PX（唔係手指抖一抖）：capture 埋 pointer，放手要食咗 click */
    moved: boolean;
}

type SheetPointerEvent = PointerEvent<HTMLElement>;

/** 按低：喺清單入面 / 已經有個 pointer 拉緊 / 表滑走緊就唔理；返回新手勢 */
const startPointer = (
    event: SheetPointerEvent,
    busy: boolean,
    getList: GetElement,
    controls: SheetDragControls,
): PointerGesture | null => {
    if (busy || event.button !== 0) return null;
    if (getList()?.contains(event.target as Node)) return null;
    if (!controls.begin(event.clientY, event.timeStamp)) return null;
    return { pointerId: event.pointerId, startY: event.clientY, moved: false };
};

/** 拉緊：拉過少少先 capture（之前仍然可以係撳掣） */
const markMoved = (event: SheetPointerEvent, current: PointerGesture) => {
    if (current.moved || Math.abs(event.clientY - current.startY) < DRAG_INTENT_PX) return;
    current.moved = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
};

type PointerBox = Box<PointerGesture | null>;

/** 放手 / 取消：只認拉緊嗰個 pointer；返回嗰個手勢（唔係就 null） */
const takePointer = (pointer: PointerBox, event: SheetPointerEvent) => {
    const current = pointer.current;
    if (current?.pointerId !== event.pointerId) return null;
    pointer.current = null;
    return current;
};

/** 滑鼠喺表外（例如遮罩）放手（isLostRelease）：當之前嗰下已經放咗手，彈返 */
const dropPointer = (pointer: PointerBox, controls: SheetDragControls) => {
    pointer.current = null;
    controls.abort();
};

/** 清單以外（grab bar / header）用 pointer，滑鼠都拖得；只跟一個 pointer */
const createPointerHandlers = (
    pointer: PointerBox,
    getList: GetElement,
    controls: SheetDragControls,
    clicks: ReturnType<typeof useClickSuppression>,
) => ({
    onPointerDown: (event: SheetPointerEvent) => {
        if (isLostRelease(pointer.current?.pointerId, event)) dropPointer(pointer, controls);
        const busy = pointer.current !== null;
        if (!busy) clicks.arm(false);
        pointer.current = startPointer(event, busy, getList, controls) ?? pointer.current;
    },
    onPointerMove: (event: SheetPointerEvent) => {
        const current = pointer.current;
        if (current?.pointerId !== event.pointerId) return;
        if (isLostRelease(current.pointerId, event)) return dropPointer(pointer, controls);
        markMoved(event, current);
        controls.move(event.clientY, event.timeStamp);
    },
    onPointerUp: (event: SheetPointerEvent) => {
        const current = takePointer(pointer, event);
        if (!current) return;
        controls.finish(event.clientY, event.timeStamp);
        // 拉過就食咗放手嗰下 click，唔會誤撳 ✕ / 播放掣
        clicks.arm(current.moved);
    },
    onPointerCancel: (event: SheetPointerEvent) =>
        void (takePointer(pointer, event) && controls.abort()),
    onClickCapture: clicks.onClickCapture,
});

/** 表閂咗 / 再開：唔記住之前（DOM 冇咗收唔到 pointerup）嘅 pointer */
export const useSheetPointerDrag = (
    elements: SheetElements,
    open: boolean,
    controls: SheetDragControls,
) => {
    const pointer: PointerBox = useBox<PointerGesture | null>(null);
    const clicks = useClickSuppression();
    useEffect(() => () => void (pointer.current = null), [open, pointer]);
    return createPointerHandlers(pointer, () => elements.list, controls, clicks);
};
