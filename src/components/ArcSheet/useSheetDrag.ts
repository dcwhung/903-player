import { useEffect, useMemo, useRef, type PointerEvent } from 'react';
import { useBox, type Box } from '../../hooks/useBox';
import { DRAG_INTENT_PX, dragIntent } from '../../hooks/swipe';
import { useClickSuppression } from '../../hooks/useSwipe';
import { prefersReducedMotion } from '../../utils/motion';
import { pushSample, velocityOf, type DragSample } from '../ShowCardStack/cardStack';
import { SHEET_SLIDE_MS, sheetOffset, shouldDismissSheet } from './sheetDrag';

interface Gesture {
    startY: number;
    /** 按低嗰陣量一次表高，拉緊唔使每格再量 */
    height: number;
    offset: number;
    samples: DragSample[];
}

/** 一個拉表手勢：按低 → 拉 → 放手（閂定彈返）；系統取消就一定彈返 */
interface SheetDragControls {
    /** 返回 false = 表滑走緊，唔接新手勢 */
    begin: (y: number, t: number) => boolean;
    move: (y: number, t: number) => void;
    finish: (y: number, t: number) => void;
    abort: () => void;
    /** 表開 / 閂時清走未完嘅手勢同閂表計時 */
    reset: () => void;
}

type GetElement = () => HTMLElement | null;

/** 表、遮罩、清單嘅 DOM：callback ref mount 時填入、unmount（null）時清走 */
interface SheetElements {
    sheet: HTMLElement | null;
    backdrop: HTMLElement | null;
    list: HTMLElement | null;
}

const bindElements = (elements: SheetElements) => ({
    sheetRef: (el: HTMLElement | null) => void (elements.sheet = el),
    backdropRef: (el: HTMLElement | null) => void (elements.backdrop = el),
    listRef: (el: HTMLElement | null) => void (elements.list = el),
});

const DRAGGING_ATTR = 'data-dragging';
const CLOSING_ATTR = 'data-closing';
const FULLY_HIDDEN = 'translateY(100%)';

/** 速度樣本只得一個方向：cardStack 嘅 DragSample.x 喺度裝直向座標 */
const toSample = (y: number, t: number): DragSample => ({ x: y, t });

/** 表向下移 offset px；遮罩跟住變淡。拉緊（data-dragging）CSS 唔做 transition，直接跟手指 */
const paint = (sheet: HTMLElement, backdrop: HTMLElement | null, { offset, height }: Gesture) => {
    sheet.style.transform = offset > 0 ? `translateY(${offset}px)` : '';
    sheet.setAttribute(DRAGGING_ATTR, 'true');
    if (!backdrop || height <= 0) return;
    backdrop.setAttribute(DRAGGING_ATTR, 'true');
    backdrop.style.opacity = String(Math.max(0, 1 - offset / height));
};

/** 放手：交返 CSS transition 做動畫，閂就滑到底（data-closing：期間唔收 tap），否則彈返原位 */
const settle = (sheet: HTMLElement | null, backdrop: HTMLElement | null, dismiss: boolean) => {
    for (const el of [sheet, backdrop]) {
        el?.removeAttribute(DRAGGING_ATTR);
        if (dismiss) el?.setAttribute(CLOSING_ATTR, 'true');
    }
    if (sheet) sheet.style.transform = dismiss ? FULLY_HIDDEN : '';
    if (backdrop) backdrop.style.opacity = dismiss ? '0' : '';
};

/** 閂表計時：滑走動畫完先 onClose；onClose 用 ref，拉緊途中 re-render（播放時間每秒更新）唔會斷 */
const useCloseTimer = (onClose: () => void) => {
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);
    const close = useMemo(
        () => ({
            schedule: () => {
                const delay = prefersReducedMotion() ? 0 : SHEET_SLIDE_MS;
                timer.current = setTimeout(() => {
                    // 閂完就唔再算「滑走緊」：就算父層冇即刻 unmount，之後都拉得返
                    timer.current = undefined;
                    onCloseRef.current();
                }, delay);
            },
            cancel: () => {
                clearTimeout(timer.current);
                timer.current = undefined;
            },
            isPending: () => timer.current !== undefined,
        }),
        [],
    );
    useEffect(() => close.cancel, [close]);
    return close;
};

/** 跟手指更新位移同速度樣本 */
const track = (gesture: Gesture, y: number, t: number) => {
    gesture.offset = sheetOffset(gesture.startY, y);
    gesture.samples = pushSample(gesture.samples, toSample(y, t));
};

/** 放手決定閂定彈返；放手位置都當一個樣本，停咗手先放唔會用返舊速度 */
const release = (gesture: Gesture, y: number, t: number): boolean => {
    track(gesture, y, t);
    const { offset, height } = gesture;
    return shouldDismissSheet({ offset, height, velocity: velocityOf(gesture.samples) });
};

interface ControlDeps {
    getSheet: GetElement;
    getBackdrop: GetElement;
    gesture: Box<Gesture | null>;
    close: ReturnType<typeof useCloseTimer>;
}

/** 按低：表滑走緊 / 已經有手勢（例如 header 同清單同時拉）就唔接；量一次表高 */
const startGesture = ({ getSheet, gesture, close }: ControlDeps, y: number, t: number) => {
    const sheet = getSheet();
    if (!sheet || close.isPending() || gesture.current) return false;
    const height = sheet.getBoundingClientRect().height;
    gesture.current = { startY: y, height, offset: 0, samples: [toSample(y, t)] };
    return true;
};

/** 放手：閂就滑走再 onClose，否則彈返 */
const endGesture = (
    { getSheet, getBackdrop, gesture, close }: ControlDeps,
    y: number,
    t: number,
) => {
    const current = gesture.current;
    gesture.current = null;
    if (!current) return;
    const dismiss = release(current, y, t);
    settle(getSheet(), getBackdrop(), dismiss);
    if (dismiss) close.schedule();
};

/** 拉表邏輯（pointer 同 touch 共用）：直接改 style，唔經 React state，拉緊唔會成張表 re-render */
const createControls = (deps: ControlDeps): SheetDragControls => ({
    begin: (y, t) => startGesture(deps, y, t),
    move: (y, t) => {
        const current = deps.gesture.current;
        const sheet = deps.getSheet();
        if (!current || !sheet) return;
        track(current, y, t);
        paint(sheet, deps.getBackdrop(), current);
    },
    finish: (y, t) => endGesture(deps, y, t),
    abort: () => {
        if (!deps.gesture.current) return;
        deps.gesture.current = null;
        settle(deps.getSheet(), deps.getBackdrop(), false);
    },
    reset: () => {
        deps.gesture.current = null;
        deps.close.cancel();
    },
});

/** controls 只靠 box，所以係穩定嘅（listener 唔會拉緊途中重新掛） */
const useSheetDragControls = (elements: SheetElements, onClose: () => void): SheetDragControls => {
    const gesture = useBox<Gesture | null>(null);
    const close = useCloseTimer(onClose);
    return useMemo(
        () =>
            createControls({
                getSheet: () => elements.sheet,
                getBackdrop: () => elements.backdrop,
                gesture,
                close,
            }),
        [elements, gesture, close],
    );
};

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
const useListTouchDrag = (elements: SheetElements, open: boolean, controls: SheetDragControls) => {
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

/**
 * 滑鼠喺表外（例如遮罩）放手：表收唔到 pointerup，手勢留低咗。
 * 同一個 pointer 再按低，或者滑鼠冇撳住掣都郁緊，就當之前嗰下已經放咗手
 */
const isLostRelease = (current: PointerGesture | null, event: SheetPointerEvent) =>
    current?.pointerId === event.pointerId &&
    (event.type === 'pointerdown' || (event.pointerType === 'mouse' && event.buttons === 0));

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
        if (isLostRelease(pointer.current, event)) dropPointer(pointer, controls);
        const busy = pointer.current !== null;
        if (!busy) clicks.arm(false);
        pointer.current = startPointer(event, busy, getList, controls) ?? pointer.current;
    },
    onPointerMove: (event: SheetPointerEvent) => {
        const current = pointer.current;
        if (current?.pointerId !== event.pointerId) return;
        if (isLostRelease(current, event)) return dropPointer(pointer, controls);
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
const usePointerDrag = (elements: SheetElements, open: boolean, controls: SheetDragControls) => {
    const pointer: PointerBox = useBox<PointerGesture | null>(null);
    const clicks = useClickSuppression();
    useEffect(() => () => void (pointer.current = null), [open, pointer]);
    return createPointerHandlers(pointer, () => elements.list, controls, clicks);
};

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
    const handlers = usePointerDrag(elements, open, controls);
    const refs = useMemo(() => bindElements(elements), [elements]);
    return { ...refs, handlers };
};
