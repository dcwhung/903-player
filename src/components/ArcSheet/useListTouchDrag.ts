import { useEffect } from 'react';
import { dragIntent } from '../../hooks/swipe';
import type { SheetDragControls, SheetElements } from './sheetDragCore';

interface ListTouch {
    id: number;
    x: number;
    y: number;
    t: number;
    /** 已經交咗畀表（拉緊表） */
    engaged: boolean;
    /** 呢下係捲清單 / 橫掃：成個手勢唔理，等佢放手 */
    ignored: boolean;
}

const findTouch = (touches: TouchList, id: number): Touch | undefined =>
    Array.from(touches).find((touch) => touch.identifier === id);

/**
 * 未交畀表：捲到頂兼向下先接手；未睇得出方向（郁唔夠 DRAG_INTENT_PX）都先 preventDefault，
 * 唔畀瀏覽器開始捲（一開始捲之後 touchmove 就 cancel 唔到）。返回呢下 touchmove 係咪表嘅
 */
const engageListTouch = (
    current: ListTouch,
    touch: Touch,
    list: HTMLElement,
    controls: SheetDragControls,
) => {
    const dy = touch.clientY - current.y;
    if (list.scrollTop > 0 || dy < 0) {
        current.ignored = true;
        return false;
    }
    const intent = dragIntent(touch.clientX - current.x, dy);
    if (intent === null) return dy > 0;
    if (intent === 'vertical') current.engaged = controls.begin(current.y, current.t);
    current.ignored = !current.engaged;
    return current.engaged;
};

/**
 * 清單入面用 touch（唔用 pointer）：清單要畀瀏覽器捲（touch-action: pan-y），捲到頂再向下拉先由表接手。
 * 只跟第一隻手指（identifier），第二隻手指唔理；touchcancel 一定彈返
 */
const createListTouchHandlers = (list: HTMLElement, controls: SheetDragControls) => {
    let current: ListTouch | null = null;
    const onStart = (event: TouchEvent) => {
        const touch = event.changedTouches[0];
        if (current || !touch) return;
        const { identifier: id, clientX: x, clientY: y } = touch;
        current = { id, x, y, t: event.timeStamp, engaged: false, ignored: false };
    };
    const onMove = (event: TouchEvent) => {
        const touch = current && findTouch(event.touches, current.id);
        if (!current || !touch || current.ignored) return;
        if (!current.engaged && !engageListTouch(current, touch, list, controls)) return;
        event.preventDefault();
        if (current.engaged) controls.move(touch.clientY, event.timeStamp);
    };
    const onEnd = (event: TouchEvent) => {
        const touch = current && findTouch(event.changedTouches, current.id);
        if (!current || !touch) return;
        if (current.engaged && event.type === 'touchcancel') controls.abort();
        else if (current.engaged) controls.finish(touch.clientY, event.timeStamp);
        current = null;
    };
    return { onStart, onMove, onEnd };
};

/** touchmove 要 non-passive 先 preventDefault 得，所以用 addEventListener */
export const useListTouchDrag = (
    elements: SheetElements,
    open: boolean,
    controls: SheetDragControls,
) => {
    useEffect(() => {
        const list = elements.list;
        if (!open || !list) return undefined;
        const { onStart, onMove, onEnd } = createListTouchHandlers(list, controls);
        list.addEventListener('touchstart', onStart, { passive: true });
        list.addEventListener('touchmove', onMove, { passive: false });
        list.addEventListener('touchend', onEnd);
        list.addEventListener('touchcancel', onEnd);
        return () => {
            list.removeEventListener('touchstart', onStart);
            list.removeEventListener('touchmove', onMove);
            list.removeEventListener('touchend', onEnd);
            list.removeEventListener('touchcancel', onEnd);
        };
    }, [elements, open, controls]);
};
