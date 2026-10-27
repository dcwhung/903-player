import { useEffect, useMemo, useRef } from 'react';
import { useBox, type Box } from '../../hooks/useBox';
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
export interface SheetDragControls {
    /** 返回 false = 表滑走緊，唔接新手勢 */
    begin: (y: number, t: number) => boolean;
    move: (y: number, t: number) => void;
    finish: (y: number, t: number) => void;
    abort: () => void;
    /** 表開 / 閂時清走未完嘅手勢同閂表計時 */
    reset: () => void;
}

export type GetElement = () => HTMLElement | null;

/** 表、遮罩、清單嘅 DOM：callback ref mount 時填入、unmount（null）時清走 */
export interface SheetElements {
    sheet: HTMLElement | null;
    backdrop: HTMLElement | null;
    list: HTMLElement | null;
}

export const bindElements = (elements: SheetElements) => ({
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
export const useSheetDragControls = (
    elements: SheetElements,
    onClose: () => void,
): SheetDragControls => {
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
