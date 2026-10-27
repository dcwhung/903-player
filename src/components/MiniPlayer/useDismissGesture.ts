import { useEffect, useMemo, useState, type MouseEvent, type PointerEvent } from 'react';
import { DRAG_INTENT_PX, dragIntent, swipeDirection, type SwipeDirection } from '../../hooks/swipe';
import { isLostRelease } from '../../hooks/lostRelease';
import { useBox, type Box } from '../../hooks/useBox';
import { useClickSuppression } from '../../hooks/useSwipe';
import { prefersReducedMotion } from '../../utils/motion';
import {
    ARMED_IDLE_MS,
    DISMISS_SLIDE_MS,
    LONG_PRESS_MS,
    REVEAL_PX,
    dismissOffset,
    dismissOutcome,
} from './miniPlayerDismiss';

/** 畫面要知嘅狀態（data-* / CSS 變數） */
export interface DismissView {
    /** 撳住緊，未夠長按 */
    pressing: boolean;
    /** 長按完浮起：左滑 = 關閉，唔再係轉節目 */
    armed: boolean;
    /** 跟緊手指拉（冇 transition） */
    dragging: boolean;
    /** 停喺度露出「關閉」掣 */
    revealed: boolean;
    /** card 向左移咗幾多 px */
    offset: number;
    /** 關閉緊：card 滑走中（唔再浮起放大、唔收 tap） */
    closing: boolean;
}

interface Press {
    pointerId: number;
    x: number;
    y: number;
    /** 按低時 card 嘅位置（露出關閉掣時再拉，由嗰度接落去） */
    from: number;
    width: number;
    dragging: boolean;
    /** 呢一下按住先浮起：放手保持浮起（唔當撳 card 收返） */
    liftedNow: boolean;
}

/** 手勢狀態：成個 mini player 生命期都係同一個 object（timer 同 handler 改同一份） */
interface Session extends Omit<DismissView, 'dragging'> {
    press: Press | null;
    /** 滑走緊未 onDismiss：中途 unmount（例如撳咗節目格轉頁）都要即刻做埋 */
    pendingDismiss?: () => void;
    longPress?: ReturnType<typeof setTimeout>;
    idle?: ReturnType<typeof setTimeout>;
    slide?: ReturnType<typeof setTimeout>;
}

interface Callbacks {
    onSwipe: (direction: SwipeDirection) => void;
    onDismiss: () => void;
}

type Sync = (view: DismissView) => void;
type Clicks = ReturnType<typeof useClickSuppression>;
type MiniPointerEvent = PointerEvent<HTMLElement>;
type SessionBox = Box<Session>;

const SESSION_REST = { pressing: false, armed: false, revealed: false, offset: 0 };
const REST: DismissView = { ...SESSION_REST, dragging: false, closing: false };

const sync = (session: Session, setView: Sync) => {
    const { pressing, armed, revealed, offset, closing } = session;
    const dragging = session.press?.dragging ?? false;
    setView({ pressing, armed, revealed, offset, closing, dragging });
};

/** 變返平時：左右掃又係轉節目。手指仲撳住（例如長按完未郁）或者滑走緊就唔郁 */
const settleBack = (session: Session, setView: Sync) => {
    if (session.press || session.closing) return;
    clearTimeout(session.idle);
    Object.assign(session, SESSION_REST);
    sync(session, setView);
};

/** 浮起咗 / 露出掣之後冇郁就變返平時 */
const armIdle = (session: Session, setView: Sync) => {
    clearTimeout(session.idle);
    session.idle = setTimeout(() => settleBack(session, setView), ARMED_IDLE_MS);
};

/** 長按夠鐘：浮起。idle 由放手先開始計（撳住睇提示唔會自己跌返落嚟） */
const lift = (session: Session, setView: Sync) => {
    Object.assign(session, { pressing: false, armed: true });
    if (session.press) session.press.liftedNow = true;
    sync(session, setView);
};

/** 關閉：card 滑走（減少動畫就即刻），之後先 onDismiss（停播 + 收起） */
const dismiss = (session: Session, setView: Sync, width: number, onDismiss: () => void) => {
    if (session.closing) return;
    session.closing = true;
    clearTimeout(session.idle);
    session.offset = width;
    sync(session, setView);
    session.pendingDismiss = onDismiss;
    session.slide = setTimeout(
        () => {
            session.pendingDismiss = undefined;
            onDismiss();
        },
        prefersReducedMotion() ? 0 : DISMISS_SLIDE_MS,
    );
};

/** 浮起咗之後放手：冇拉過 = 撳 card（收返）或者啱啱長按完（保持浮起）；拉過就睇拉咗幾遠 */
const releaseArmed = (session: Session, setView: Sync, press: Press, onDismiss: () => void) => {
    if (!press.dragging) {
        if (press.liftedNow) armIdle(session, setView);
        else settleBack(session, setView);
        return;
    }
    const outcome = dismissOutcome(session.offset, press.width);
    if (outcome === 'dismiss') return dismiss(session, setView, press.width, onDismiss);
    if (outcome === 'collapse') return settleBack(session, setView);
    Object.assign(session, { offset: REVEAL_PX, revealed: true });
    armIdle(session, setView);
    sync(session, setView);
};

/** 拉緊：未浮起郁得多就取消長按；浮起咗橫拉就 card 跟手指 */
const track = (session: Session, setView: Sync, press: Press, event: MiniPointerEvent) => {
    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    if (!session.armed) {
        if (Math.hypot(dx, dy) < DRAG_INTENT_PX || !session.pressing) return;
        clearTimeout(session.longPress);
        session.pressing = false;
        return sync(session, setView);
    }
    if (!press.dragging && dragIntent(dx, dy) !== 'horizontal') return;
    if (!press.dragging) event.currentTarget.setPointerCapture?.(event.pointerId);
    press.dragging = true;
    session.offset = dismissOffset(press.from, dx, press.width);
    sync(session, setView);
};

/** 按低：未浮起就開始計長按；浮起咗就準備拉（停計 idle） */
const startPress = (session: Session, setView: Sync, event: MiniPointerEvent) => {
    const { clientX: x, clientY: y, pointerId } = event;
    const width = event.currentTarget.getBoundingClientRect().width;
    const from = session.offset;
    session.press = { pointerId, x, y, from, width, dragging: false, liftedNow: false };
    if (session.armed) return clearTimeout(session.idle);
    session.pressing = true;
    session.longPress = setTimeout(() => lift(session, setView), LONG_PRESS_MS);
    sync(session, setView);
};

const takePress = (session: Session, event: MiniPointerEvent) => {
    const current = session.press;
    if (current?.pointerId !== event.pointerId) return null;
    session.press = null;
    clearTimeout(session.longPress);
    return current;
};

interface Release {
    session: Session;
    setView: Sync;
    clicks: Clicks;
    callbacks: Callbacks;
}

/** 未浮起放手：照舊係左右掃轉節目（同 useSwipe 一樣，掃完食咗 click） */
const releaseSwipe = (
    { session, setView, clicks, callbacks }: Release,
    current: Press,
    event: MiniPointerEvent,
) => {
    session.pressing = false;
    sync(session, setView);
    const direction = swipeDirection(event.clientX - current.x, event.clientY - current.y);
    clicks.arm(direction !== null);
    if (direction) callbacks.onSwipe(direction);
};

/** 放手：浮起咗嗰下 click 一律食咗（唔會開節目頁 / 播放暫停），再決定關閉 / 露出掣 / 收返 */
const release = (release: Release, event: MiniPointerEvent) => {
    const { session, setView, clicks, callbacks } = release;
    const current = takePress(session, event);
    if (!current) return;
    if (!session.armed) return releaseSwipe(release, current, event);
    clicks.arm(true);
    releaseArmed(session, setView, current, callbacks.onDismiss);
};

/** 滑鼠喺 card 外放手（isLostRelease）：當之前嗰下已經放咗手，取消長按 / 拉動 */
const dropPress = (session: Session, setView: Sync) => {
    clearTimeout(session.longPress);
    session.press = null;
    session.pressing = false;
    settleBack(session, setView);
};

/** handlers 執行時先由 box 攞 session（render 時唔讀）；只認主掣（右鍵 / 中鍵唔浮起） */
const createHandlers = (box: SessionBox, setView: Sync, clicks: Clicks, callbacks: Callbacks) => ({
    onPointerDown: (event: MiniPointerEvent) => {
        const session = box.current;
        if (isLostRelease(session.press?.pointerId, event)) dropPress(session, setView);
        if (session.press || session.closing || event.button !== 0) return;
        clicks.arm(false);
        startPress(session, setView, event);
    },
    onPointerMove: (event: MiniPointerEvent) => {
        const { press } = box.current;
        if (press?.pointerId !== event.pointerId) return;
        if (isLostRelease(press.pointerId, event)) return dropPress(box.current, setView);
        track(box.current, setView, press, event);
    },
    onPointerUp: (event: MiniPointerEvent) =>
        release({ session: box.current, setView, clicks, callbacks }, event),
    onPointerCancel: (event: MiniPointerEvent) => {
        if (takePress(box.current, event)) settleBack(box.current, setView);
    },
    onClickCapture: clicks.onClickCapture,
    onContextMenu: (event: MouseEvent<HTMLElement>) => event.preventDefault(),
});

/** 浮起咗：撳 mini player 以外 / Escape 就變返平時 */
const useSettleOutside = (
    armed: boolean,
    box: SessionBox,
    setView: Sync,
    container: Box<HTMLElement | null>,
) => {
    useEffect(() => {
        if (!armed) return undefined;
        const onPointerDown = (event: Event) => {
            if (!container.current?.contains(event.target as Node))
                settleBack(box.current, setView);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') settleBack(box.current, setView);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [armed, box, setView, container]);
};

/** 外框（card + 後面關閉掣）：callback ref 填入，撳外面判斷 / 關閉掣量闊度用 */
const createContainerApi = (
    box: SessionBox,
    setView: Sync,
    container: Box<HTMLElement | null>,
    onDismiss: () => void,
) => ({
    bindContainer: (el: HTMLElement | null) => void (container.current = el),
    dismiss: () => {
        const width = container.current?.getBoundingClientRect().width ?? 0;
        dismiss(box.current, setView, width, onDismiss);
    },
});

const newSession = (): Session => ({ ...SESSION_REST, press: null, closing: false });

/**
 * mini player 手勢：平時左右掃轉節目；長按（唔郁）0.25 秒浮起之後，左滑（似 iOS 鎖屏通知）關閉：
 * 拉過一半闊度放手即關，拉少少就停喺度露出「關閉」掣。見 design/previews/swipe-dismiss-preview.html
 */
export const useDismissGesture = (
    onSwipe: Callbacks['onSwipe'],
    onDismiss: Callbacks['onDismiss'],
) => {
    const box = useBox<Session>(newSession());
    const container = useBox<HTMLElement | null>(null);
    const [view, setView] = useState<DismissView>(REST);
    const clicks = useClickSuppression();
    // unmount：停晒 timer；滑走緊就即刻做埋關閉（停播 + 收起），唔會返主頁又見返
    useEffect(
        () => () => {
            const { longPress, idle, slide, pendingDismiss } = box.current;
            [longPress, idle, slide].forEach(clearTimeout);
            pendingDismiss?.();
        },
        [box],
    );
    useSettleOutside(view.armed, box, setView, container);
    const api = useMemo(
        () => createContainerApi(box, setView, container, onDismiss),
        [box, container, onDismiss],
    );
    const handlers = createHandlers(box, setView, clicks, { onSwipe, onDismiss });
    return { view, handlers, ...api };
};
