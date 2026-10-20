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
        // 碟仲轉緊就由畫面上嘅角度接住，唔好跳去目標角度
        options.motion.grab();
    }
    options.motion.follow(stripOffset(dx, options.neighbours));
};

/** 放手：stripRelease 決定轉（交畀 onGo）定彈返；返回有冇當係掃（即使之前冇 pointermove） */
const releaseStrip = (
    session: DragSession,
    event: StripPointer,
    options: StripGestureOptions,
): boolean => {
    const gesture = {
        dx: event.clientX - session.x,
        dy: event.clientY - session.y,
        ms: performance.now() - session.t,
        width: event.currentTarget.clientWidth,
    };
    const { direction } = stripRelease(gesture, options.neighbours);
    if (direction) options.onGo(direction);
    else if (session.dragging) options.motion.springBack();
    return direction !== null;
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
            // 冇 pointermove 但放手時已經算掃（轉咗集）：之後嘅 click 都要食咗，唔好再撳多次側格
            const swiped = releaseStrip(current, event, options);
            justDragged.current = current.dragging || swiped;
        },
        onPointerCancel: () => {
            session.current = null;
            options.motion.springBack();
        },
        onClickCapture: (event: MouseEvent<HTMLElement>) =>
            swallowClickAfterDrag(event, justDragged),
    };
};
