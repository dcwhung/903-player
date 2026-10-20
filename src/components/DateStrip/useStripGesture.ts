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
    /** 開始拖（捉住碟）/ 放手或取消：畀外面暫停碟自轉 */
    onHold?: ((held: boolean) => void) | undefined;
}

interface DragSession {
    /** 邊隻手指開始嘅；其他手指嘅 events 唔理 */
    pointerId: number;
    x: number;
    y: number;
    t: number;
    dragging: boolean;
}

type StripPointer = PointerEvent<HTMLElement>;
type StripClick = MouseEvent<HTMLElement>;

/** 拖緊：過咗 slop 先 capture（之前仍然可以係 tap 側格），之後成條跟手指 */
const moveStrip = (session: DragSession, event: StripPointer, options: StripGestureOptions) => {
    // 滑鼠冇撳掣 = 只係 hover（例如喺條外面放咗手，收唔到 pointerup），唔當拖
    if (event.pointerType === 'mouse' && event.buttons === 0) return;
    const dx = event.clientX - session.x;
    if (!session.dragging) {
        const dy = event.clientY - session.y;
        if (Math.abs(dx) < DRAG_SLOP_PX || Math.abs(dx) <= Math.abs(dy)) return;
        session.dragging = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        // 碟仲轉緊就由畫面上嘅角度接住，唔好跳去目標角度
        options.motion.grab();
        options.onHold?.(true);
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

/** 放手：轉集或者彈返，記低之後嘅 click 要唔要食，拖緊就放返碟 */
const finishStrip = (
    session: DragSession,
    event: StripPointer,
    options: StripGestureOptions,
    justDragged: RefObject<boolean>,
) => {
    // 冇 pointermove 但放手時已經算掃（轉咗集）：之後嘅 click 都要食咗，唔好再撳多次側格
    const swiped = releaseStrip(session, event, options);
    justDragged.current = session.dragging || swiped;
    if (session.dragging) options.onHold?.(false);
};

/** 取消（例如系統搶咗手勢）：放返碟，彈返原位 */
const cancelStrip = (session: DragSession, options: StripGestureOptions) => {
    if (session.dragging) options.onHold?.(false);
    options.motion.springBack();
};

/** 拖完瀏覽器可能仍然發 click，喺 capture 階段食咗佢；鍵盤 / 輔助技術嘅 click（detail 0）照放行 */
const swallowClickAfterDrag = (event: StripClick, justDragged: RefObject<boolean>) => {
    const dragged = justDragged.current;
    justDragged.current = false;
    if (!dragged || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
};

/** 起手：記低邊隻手指同位置 */
const beginStrip = (event: StripPointer): DragSession => ({
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    t: performance.now(),
    dragging: false,
});

/** 而家呢個 session 係咪由呢隻手指開始（第二隻手指唔可以搶走 / 結束佢） */
const ownSession = (session: DragSession | null, event: StripPointer): DragSession | null =>
    session?.pointerId === event.pointerId ? session : null;

/** 日子條嘅 pointer events（滑鼠同手指都得） */
export const useStripGesture = (options: StripGestureOptions) => {
    const session = useRef<DragSession | null>(null);
    const justDragged = useRef(false);
    return {
        onPointerDown: (event: StripPointer) => {
            // 拖緊時第二隻手指撳落唔可以蓋過，否則 onHold(false) 永遠唔會發，碟停咗唔再轉；
            // 未開始拖嘅 session 可以換走（滑鼠喺條外面放手唔會有 pointerup，唔換就會卡死）
            if (session.current?.dragging) return;
            session.current = beginStrip(event);
            justDragged.current = false;
        },
        onPointerMove: (event: StripPointer) => {
            const current = ownSession(session.current, event);
            if (current) moveStrip(current, event, options);
        },
        onPointerUp: (event: StripPointer) => {
            const current = ownSession(session.current, event);
            if (!current) return;
            session.current = null;
            finishStrip(current, event, options, justDragged);
        },
        onPointerCancel: (event: StripPointer) => {
            const current = ownSession(session.current, event);
            if (!current) return;
            session.current = null;
            cancelStrip(current, options);
        },
        onClickCapture: (event: StripClick) => swallowClickAfterDrag(event, justDragged),
    };
};
