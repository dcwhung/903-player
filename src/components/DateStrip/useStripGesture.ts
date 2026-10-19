import { useRef, type MouseEvent, type PointerEvent, type RefObject } from 'react';
import type { SwipeDirection } from '../../hooks/swipe';
import { stripOffset, stripRelease, type StripNeighbours } from './dateStrip';
import type { StripMotion } from './useStripMotion';

/** 郁過 8px（而且主要係橫向）先當係拖，之前仍然可以係撳側格 */
const DRAG_SLOP_PX = 8;

interface StripGestureOptions {
    neighbours: StripNeighbours;
    motion: StripMotion;
    /** 放手時過咗門檻：想轉去邊個方向（盡頭由 onGo 自己彈返） */
    onGo: (direction: SwipeDirection) => void;
}

interface DragSession {
    x: number;
    y: number;
    t: number;
    dragging: boolean;
}

type StripPointer = PointerEvent<HTMLElement>;

/** 拖緊：過咗 slop 先 capture（之前仍然可以係 tap 側格），之後成條跟手指 */
const moveStrip = (session: DragSession, event: StripPointer, options: StripGestureOptions) => {
    const dx = event.clientX - session.x;
    if (!session.dragging) {
        const dy = event.clientY - session.y;
        if (Math.abs(dx) < DRAG_SLOP_PX || Math.abs(dx) <= Math.abs(dy)) return;
        session.dragging = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    options.motion.follow(stripOffset(dx, options.neighbours));
};

/** 放手：stripRelease 決定轉（交畀 onGo）定彈返 */
const releaseStrip = (session: DragSession, event: StripPointer, options: StripGestureOptions) => {
    const gesture = {
        dx: event.clientX - session.x,
        dy: event.clientY - session.y,
        ms: performance.now() - session.t,
        width: event.currentTarget.clientWidth,
    };
    const { direction } = stripRelease(gesture, options.neighbours);
    if (direction) options.onGo(direction);
    else if (session.dragging) options.motion.springBack();
};

/** 拖完瀏覽器可能仍然發 click，喺 capture 階段食咗佢；鍵盤 / 輔助技術嘅 click（detail 0）照放行 */
const swallowClickAfterDrag = (event: MouseEvent<HTMLElement>, justDragged: RefObject<boolean>) => {
    const dragged = justDragged.current;
    justDragged.current = false;
    if (!dragged || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
};

/** 日子條嘅 pointer events（滑鼠同手指都得） */
export const useStripGesture = (options: StripGestureOptions) => {
    const session = useRef<DragSession | null>(null);
    const justDragged = useRef(false);
    return {
        onPointerDown: (event: StripPointer) => {
            options.motion.flush();
            const t = performance.now();
            session.current = { x: event.clientX, y: event.clientY, t, dragging: false };
            justDragged.current = false;
        },
        onPointerMove: (event: StripPointer) => {
            if (session.current) moveStrip(session.current, event, options);
        },
        onPointerUp: (event: StripPointer) => {
            const current = session.current;
            if (!current) return;
            session.current = null;
            justDragged.current = current.dragging;
            releaseStrip(current, event, options);
        },
        onPointerCancel: () => {
            session.current = null;
            options.motion.springBack();
        },
        onClickCapture: (event: MouseEvent<HTMLElement>) =>
            swallowClickAfterDrag(event, justDragged),
    };
};
