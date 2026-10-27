import { prefersReducedMotion } from '../../utils/motion';
import { ARMED_IDLE_MS, DISMISS_SLIDE_MS, REVEAL_PX, dismissOutcome } from './miniPlayerDismiss';

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

export interface Press {
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
export interface Session extends Omit<DismissView, 'dragging'> {
    press: Press | null;
    /** 滑走緊未 onDismiss：中途 unmount（例如撳咗節目格轉頁）都要即刻做埋 */
    pendingDismiss?: () => void;
    longPress?: ReturnType<typeof setTimeout>;
    idle?: ReturnType<typeof setTimeout>;
    slide?: ReturnType<typeof setTimeout>;
}

export type Sync = (view: DismissView) => void;

/** takePress 只睇邊隻手指（pointer event 結構上符合，唔使依賴 DOM / React 型別） */
export interface PointerRef {
    pointerId: number;
}

export const SESSION_REST = { pressing: false, armed: false, revealed: false, offset: 0 };
export const REST: DismissView = { ...SESSION_REST, dragging: false, closing: false };

export const newSession = (): Session => ({ ...SESSION_REST, press: null, closing: false });

export const sync = (session: Session, setView: Sync) => {
    const { pressing, armed, revealed, offset, closing } = session;
    const dragging = session.press?.dragging ?? false;
    setView({ pressing, armed, revealed, offset, closing, dragging });
};

/** 變返平時：左右掃又係轉節目。手指仲撳住（例如長按完未郁）或者滑走緊就唔郁 */
export const settleBack = (session: Session, setView: Sync) => {
    if (session.press || session.closing) return;
    clearTimeout(session.idle);
    Object.assign(session, SESSION_REST);
    sync(session, setView);
};

/** 浮起咗 / 露出掣之後冇郁就變返平時 */
export const armIdle = (session: Session, setView: Sync) => {
    clearTimeout(session.idle);
    session.idle = setTimeout(() => settleBack(session, setView), ARMED_IDLE_MS);
};

/** 長按夠鐘：浮起。idle 由放手先開始計（撳住睇提示唔會自己跌返落嚟） */
export const lift = (session: Session, setView: Sync) => {
    Object.assign(session, { pressing: false, armed: true });
    if (session.press) session.press.liftedNow = true;
    sync(session, setView);
};

/** 關閉：card 滑走（減少動畫就即刻），之後先 onDismiss（停播 + 收起） */
export const dismiss = (session: Session, setView: Sync, width: number, onDismiss: () => void) => {
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
export const releaseArmed = (
    session: Session,
    setView: Sync,
    press: Press,
    onDismiss: () => void,
) => {
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

/** 攞走呢隻手指嘅 press（停計長按）；唔係同一隻手指就唔理 */
export const takePress = (session: Session, event: PointerRef) => {
    const current = session.press;
    if (current?.pointerId !== event.pointerId) return null;
    session.press = null;
    clearTimeout(session.longPress);
    return current;
};

/** 滑鼠喺 card 外放手（isLostRelease）：當之前嗰下已經放咗手，取消長按 / 拉動 */
export const dropPress = (session: Session, setView: Sync) => {
    clearTimeout(session.longPress);
    session.press = null;
    session.pressing = false;
    settleBack(session, setView);
};
