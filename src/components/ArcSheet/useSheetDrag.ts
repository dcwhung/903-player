import { useCallback, useEffect, useRef, type PointerEvent, type RefObject } from 'react';
import { DRAG_INTENT_PX } from '../../hooks/swipe';
import { useClickSuppression } from '../../hooks/useSwipe';
import { prefersReducedMotion } from '../../utils/motion';
import { pushSample, velocityOf, type DragSample } from '../ShowCardStack/cardStack';
import { SHEET_SLIDE_MS, sheetOffset, shouldDismissSheet } from './sheetDrag';

interface Gesture {
    startY: number;
    offset: number;
    /** 最近嘅位置樣本（DragSample 嘅 x 喺度當直向座標用），計放手速度 */
    samples: DragSample[];
}

/** 一個拉表手勢嘅三步：按低（起點）→ 拉（跟手指）→ 放手（閂定彈返） */
interface SheetDragControls {
    begin: (y: number, t: number) => void;
    move: (y: number, t: number) => void;
    finish: () => void;
}

const DRAGGING_ATTR = 'data-dragging';
const FULLY_HIDDEN = 'translateY(100%)';

/** 表向下移 offset px；遮罩跟住變淡。拉緊（data-dragging）CSS 唔做 transition，直接跟手指 */
const paint = (sheet: HTMLElement | null, backdrop: HTMLElement | null, offset: number) => {
    if (!sheet) return;
    sheet.style.transform = offset > 0 ? `translateY(${offset}px)` : '';
    sheet.setAttribute(DRAGGING_ATTR, 'true');
    const height = sheet.getBoundingClientRect().height;
    if (!backdrop || height <= 0) return;
    backdrop.setAttribute(DRAGGING_ATTR, 'true');
    backdrop.style.opacity = String(Math.max(0, 1 - offset / height));
};

/** 放手：交返 CSS transition 做動畫，閂就滑到底，否則彈返原位 */
const settle = (sheet: HTMLElement | null, backdrop: HTMLElement | null, dismiss: boolean) => {
    if (!sheet) return;
    sheet.removeAttribute(DRAGGING_ATTR);
    sheet.style.transform = dismiss ? FULLY_HIDDEN : '';
    if (!backdrop) return;
    backdrop.removeAttribute(DRAGGING_ATTR);
    backdrop.style.opacity = dismiss ? '0' : '';
};

/**
 * 表嘅拉動邏輯（pointer 同 touch 共用）：跟手指向下移，放手拉過 25% 表高 / 向下甩就滑走再 onClose，
 * 否則彈返。直接改 style，唔經 React state，拉緊唔會成張表 re-render
 */
const useSheetDragControls = (
    sheetRef: RefObject<HTMLElement | null>,
    backdropRef: RefObject<HTMLElement | null>,
    onClose: () => void,
): SheetDragControls => {
    const gesture = useRef<Gesture | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    // 父層每次 render 可能俾新嘅 onClose；拉緊途中 re-render（例如播放時間每秒更新）唔可以斷手勢
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);
    useEffect(() => () => clearTimeout(closeTimer.current), []);

    const begin = useCallback((y: number, t: number) => {
        gesture.current = { startY: y, offset: 0, samples: [{ x: y, t }] };
    }, []);
    const move = useCallback(
        (y: number, t: number) => {
            const current = gesture.current;
            if (!current) return;
            current.offset = sheetOffset(current.startY, y);
            current.samples = pushSample(current.samples, { x: y, t });
            paint(sheetRef.current, backdropRef.current, current.offset);
        },
        [sheetRef, backdropRef],
    );
    const finish = useCallback(() => {
        const current = gesture.current;
        gesture.current = null;
        const sheet = sheetRef.current;
        if (!current || !sheet) return;
        const height = sheet.getBoundingClientRect().height;
        const velocity = velocityOf(current.samples);
        const dismiss = shouldDismissSheet({ offset: current.offset, height, velocity });
        settle(sheet, backdropRef.current, dismiss);
        if (!dismiss) return;
        const delay = prefersReducedMotion() ? 0 : SHEET_SLIDE_MS;
        closeTimer.current = setTimeout(() => onCloseRef.current(), delay);
    }, [sheetRef, backdropRef]);
    return { begin, move, finish };
};

/**
 * 清單入面用 touch（唔用 pointer）：清單要畀瀏覽器捲（touch-action: pan-y），
 * 捲到頂再向下拉先由表接手，同時 preventDefault 唔畀瀏覽器捲 / 回彈。
 * touchmove 要 non-passive 先 preventDefault 得，所以用 addEventListener
 */
const useListTouchDrag = (
    listRef: RefObject<HTMLElement | null>,
    open: boolean,
    { begin, move, finish }: SheetDragControls,
) => {
    useEffect(() => {
        const list = listRef.current;
        if (!open || !list) return undefined;
        let startY: number | null = null;
        let engaged = false;
        const onStart = (event: TouchEvent) => {
            startY = event.touches.length === 1 ? (event.touches[0]?.clientY ?? null) : null;
            engaged = false;
        };
        const onMove = (event: TouchEvent) => {
            const y = event.touches[0]?.clientY;
            if (startY === null || y === undefined) return;
            if (!engaged) {
                // 向上捲 / 未捲到頂：成個手勢交返畀清單捲
                if (y < startY || list.scrollTop > 0) startY = null;
                if (startY === null || y === startY) return;
                engaged = true;
                begin(startY, event.timeStamp);
            }
            event.preventDefault();
            move(y, event.timeStamp);
        };
        const onEnd = () => {
            if (engaged) finish();
            startY = null;
            engaged = false;
        };
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
    }, [listRef, open, begin, move, finish]);
};

interface PointerGesture {
    pointerId: number;
    startY: number;
    /** 拉過 DRAG_INTENT_PX（唔係手指抖一抖）：capture 埋 pointer，放手要食咗 click */
    moved: boolean;
}

/** grab bar / header 用 pointer（滑鼠都拖得）；喺清單入面開始嘅就唔理，交畀 useListTouchDrag */
const useHandlePointerDrag = (
    listRef: RefObject<HTMLElement | null>,
    { begin, move, finish }: SheetDragControls,
) => {
    const pointer = useRef<PointerGesture | null>(null);
    const clicks = useClickSuppression();
    const end = () => {
        const moved = pointer.current?.moved ?? false;
        pointer.current = null;
        finish();
        return moved;
    };
    return {
        onPointerDown: (event: PointerEvent<HTMLElement>) => {
            clicks.arm(false);
            if (event.button !== 0 || listRef.current?.contains(event.target as Node)) return;
            pointer.current = { pointerId: event.pointerId, startY: event.clientY, moved: false };
            begin(event.clientY, event.timeStamp);
        },
        onPointerMove: (event: PointerEvent<HTMLElement>) => {
            const current = pointer.current;
            if (current?.pointerId !== event.pointerId) return;
            if (!current.moved && Math.abs(event.clientY - current.startY) >= DRAG_INTENT_PX) {
                current.moved = true;
                event.currentTarget.setPointerCapture?.(event.pointerId);
            }
            move(event.clientY, event.timeStamp);
        },
        onPointerUp: (event: PointerEvent<HTMLElement>) => {
            if (pointer.current?.pointerId !== event.pointerId) return;
            // 拉過就食咗放手嗰下 click，唔會誤撳 ✕ / 播放掣
            clicks.arm(end());
        },
        onPointerCancel: () => {
            if (pointer.current) end();
        },
        onClickCapture: clicks.onClickCapture,
    };
};

/**
 * 全集表向下拉閂（直版、橫版 docked 一樣）：grab bar / header 隨時拉得；
 * 清單捲到頂再向下拉都得。返回要掛喺遮罩 / 清單嘅 ref 同埋表嘅 pointer handlers
 */
export const useSheetDrag = (
    sheetRef: RefObject<HTMLElement | null>,
    open: boolean,
    onClose: () => void,
) => {
    const backdropRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const controls = useSheetDragControls(sheetRef, backdropRef, onClose);
    useListTouchDrag(listRef, open, controls);
    const handlers = useHandlePointerDrag(listRef, controls);
    return { backdropRef, listRef, handlers };
};
