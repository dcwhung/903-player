import type { KeyboardEvent, PointerEvent } from 'react';
import { dragIntent, type DragIntent } from '../../../../hooks/swipe';
import { useBox, type Box } from '../../../../hooks/useBox';
import { useClickSuppression } from '../../../../hooks/useSwipe';
import { cssMs } from '../../../../utils/cssTime';
import { prefersReducedMotion } from '../../../../utils/motion';

/** 拖過行闊嘅幾多先算移除（_mockups_/bookmark SWIPE_REMOVE）；唔夠就彈返 */
export const SWIPE_REMOVE_RATIO = 0.4;

/** 滑走嗰下推出行外面幾遠（連後面紅底 🗑 一齊走） */
const SLIDE_OUT = 'translateX(-110%)';
/** 滑走、彈返、收埋都用淡入淡出嘅過場時間（tokens.css），timer 由同一個 token 讀 */
const FADE_VAR = '--view-transition-fade';
const SLIDE = `transform var(${FADE_VAR}) var(--ease-view-transition)`;
const COLLAPSE = ['height', 'opacity', 'padding', 'margin']
    .map((prop) => `${prop} var(${FADE_VAR}) var(--ease-view-transition)`)
    .join(', ');

const fadeMs = (): number =>
    cssMs(getComputedStyle(document.documentElement).getPropertyValue(FADE_VAR));

const countRows = (el: Element | null): number =>
    el?.querySelectorAll('[data-saved-row]').length ?? 0;

/** 收埋邊個：呢行；佢係段最後一行就成段；段係 box 最後一段就成個 box（連欄入面嗰格） */
const collapseTarget = (row: HTMLElement): HTMLElement => {
    const box = row.closest<HTMLElement>('[data-saved-box]');
    if (box && countRows(box) === 1) return box.parentElement ?? box;
    const section = row.closest<HTMLElement>('[data-saved-section]');
    return section && countRows(section) === 1 ? section : row;
};

/** 高度由而家收到 0（淡走）；唔等 transitionend，時間到就當收好（減少動態 / 背景分頁都唔會卡住） */
const collapse = (target: HTMLElement, ms: number, done: () => void) => {
    const { style } = target;
    style.height = `${target.offsetHeight}px`;
    style.overflow = 'hidden';
    style.transition = COLLAPSE;
    requestAnimationFrame(() => {
        Object.assign(style, { height: '0px', opacity: '0', padding: '0px', margin: '0px' });
    });
    window.setTimeout(done, ms);
};

/** 移除：減少動態就即刻移走；否則行滑走 → 收埋（行 / 段 / box）→ 先真係移除收藏 */
const slideAway = (row: HTMLElement | null, card: HTMLElement | null, onRemove: () => void) => {
    if (!row || !card || prefersReducedMotion()) {
        onRemove();
        return;
    }
    const ms = fadeMs();
    card.style.transition = SLIDE;
    card.style.transform = SLIDE_OUT;
    window.setTimeout(() => collapse(collapseTarget(row), ms, onRemove), ms);
};

/** 唔夠四成：彈返原位（減少動態就即刻返） */
const springBack = (card: HTMLElement) => {
    card.style.transition = prefersReducedMotion() ? 'none' : SLIDE;
    card.style.transform = '';
};

interface Drag {
    x: number;
    y: number;
    dx: number;
    intent: DragIntent | null;
}

/** 跟手指：郁夠先睇橫定直；橫先捉住 pointer、行跟手指向左（唔准向右） */
const follow = (drag: Drag, card: HTMLElement, event: PointerEvent<HTMLElement>) => {
    const dx = event.clientX - drag.x;
    if (drag.intent === null) {
        drag.intent = dragIntent(dx, event.clientY - drag.y);
        if (drag.intent !== 'horizontal') return;
        card.setPointerCapture?.(event.pointerId);
        card.style.transition = 'none';
    }
    if (drag.intent !== 'horizontal') return;
    drag.dx = Math.min(0, dx);
    card.style.transform = `translateX(${drag.dx}px)`;
};

const isRemoveKey = (key: string) => key === 'Delete' || key === 'Backspace';

interface SwipeState {
    row: HTMLLIElement | null;
    card: HTMLDivElement | null;
    drag: Drag | null;
}

type Clicks = ReturnType<typeof useClickSuppression>;

/** 放手：過咗四成就移除，唔夠（或者畀系統取消）就彈返 */
const release = (state: SwipeState, cancelled: boolean, remove: () => void) => {
    const { drag, card } = state;
    state.drag = null;
    if (drag?.intent !== 'horizontal' || !card) return false;
    if (!cancelled && -drag.dx > card.offsetWidth * SWIPE_REMOVE_RATIO) remove();
    else springBack(card);
    return true;
};

/** pointer handlers（module 層面建立，手勢狀態放喺 useBox，見 hooks/useBox）；橫拖完個 click 食咗 */
const createHandlers = (box: Box<SwipeState>, clicks: Clicks, remove: () => void) => {
    const end = (cancelled: boolean) => clicks.arm(release(box.current, cancelled, remove));
    return {
        onPointerDown: (event: PointerEvent<HTMLElement>) => {
            box.current.drag = { x: event.clientX, y: event.clientY, dx: 0, intent: null };
            clicks.arm(false);
        },
        onPointerMove: (event: PointerEvent<HTMLElement>) => {
            const { drag, card } = box.current;
            if (drag && card) follow(drag, card, event);
        },
        onPointerUp: () => end(false),
        onPointerCancel: () => end(true),
        onClickCapture: clicks.onClickCapture,
    };
};

const createSwipe = (
    box: Box<SwipeState>,
    clicks: Clicks,
    onRemove: () => void,
    onCommit: () => void,
) => {
    // 決定移除嗰刻就講（onCommit），唔等滑走 / 收埋完先講
    const remove = () => {
        onCommit();
        slideAway(box.current.row, box.current.card, onRemove);
    };
    return {
        bindRow: (el: HTMLLIElement | null) => void (box.current.row = el),
        bindCard: (el: HTMLDivElement | null) => void (box.current.card = el),
        handlers: createHandlers(box, clicks, remove),
        onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            if (!isRemoveKey(event.key)) return;
            event.preventDefault();
            remove();
        },
    };
};

/**
 * 收藏 tab 每行左滑移除（_mockups_/bookmark）：行跟手指向左，紅底 🗑 貼喺行右邊外面一齊走；
 * 放手時過咗行闊四成就滑走、收埋再移除，唔夠就彈返。直向拖交返畀瀏覽器捲（touch-action: pan-y）。
 * 鍵盤：Delete / Backspace 移除（左滑嘅代替）。onCommit：決定移除嗰刻叫（例如出提示），onRemove 喺收埋完先叫
 */
export const useRowSwipe = (onRemove: () => void, onCommit: () => void = () => {}) => {
    const box = useBox<SwipeState>({ row: null, card: null, drag: null });
    const clicks = useClickSuppression();
    return createSwipe(box, clicks, onRemove, onCommit);
};
