import { useEffect, useMemo, useState, type MouseEvent, type PointerEvent } from 'react';
import { DRAG_INTENT_PX, dragIntent, swipeDirection, type SwipeDirection } from '../../hooks/swipe';
import { isLostRelease } from '../../hooks/lostRelease';
import { useBox, type Box } from '../../hooks/useBox';
import { useClickSuppression } from '../../hooks/useSwipe';
import {
    REST,
    dismiss,
    dropPress,
    lift,
    newSession,
    releaseArmed,
    settleBack,
    sync,
    takePress,
    type DismissView,
    type Press,
    type Session,
    type Sync,
} from './dismissSession';
import { LONG_PRESS_MS, dismissOffset } from './miniPlayerDismiss';

// DismissView 原本喺呢度定義；MiniPlayer / dismissView 仲由呢個路徑 import
export type { DismissView } from './dismissSession';

interface Callbacks {
    onSwipe: (direction: SwipeDirection) => void;
    /**
     * 滑走完先叫（停播 + 收起）。`closing` 係終態：onDismiss 必須令 MiniPlayer unmount
     * （useMiniPlayer 回 null）；再出現時係新 session
     */
    onDismiss: () => void;
}

type Clicks = ReturnType<typeof useClickSuppression>;
type MiniPointerEvent = PointerEvent<HTMLElement>;
type SessionBox = Box<Session>;

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

/**
 * mini player 手勢：平時左右掃轉節目；長按（唔郁）0.25 秒浮起之後，左滑（似 iOS 鎖屏通知）關閉：
 * 拉過一半闊度放手即關，拉少少就停喺度露出「關閉」掣。見 design/previews/swipe-dismiss-preview.html
 *
 * @param onDismiss `closing` 係終態：onDismiss 必須令 MiniPlayer unmount（useMiniPlayer 回 null）；
 *   再出現時係新 session（useBox(newSession())），呢個 hook 唔會自己 reset
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
