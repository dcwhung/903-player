import { useEffect, useRef, type RefObject } from 'react';
import { DRAG_INTENT_PX, type SwipeDirection } from '../../hooks/swipe';
import { prefersReducedMotion } from '../../utils/motion';
import {
    CARD_FLY_MS,
    CARD_SPRING_MS,
    RETURN_PEEK_RATIO,
    cardRotation,
    dragProgress,
    translateXOf,
} from './cardStack';

/** 卡疊做緊乜（寫喺 data-phase）；冇 data-phase = 靜止，冇 transition */
type CardPhase = 'dragging' | 'settling' | `fly-${SwipeDirection}`;

/** 拖動姿勢嘅 CSS 變數；清走就返去 CSS 預設（或者 data-phase 嘅飛走位置） */
const POSE_VARS = [
    '--card-dx',
    '--card-rotate',
    '--card-forward',
    '--card-return',
    '--card-reveal',
] as const;

interface MotionRefs {
    stack: RefObject<HTMLDivElement | null>;
    top: RefObject<HTMLDivElement | null>;
    timer: RefObject<number | undefined>;
    flying: RefObject<boolean>;
    /** 每次 fly() 加一（連減少動畫即刻換都計），俾手勢認出中途有冇飛過 */
    flight: RefObject<number>;
}

/** 清走拖動姿勢，再轉去指定 phase（null = 靜止） */
const pose = (refs: MotionRefs, phase: CardPhase | null) => {
    const el = refs.stack.current;
    if (!el) return;
    POSE_VARS.forEach((name) => el.style.removeProperty(name));
    if (phase) el.dataset.phase = phase;
    else delete el.dataset.phase;
};

const rest = (refs: MotionRefs) => {
    refs.flying.current = false;
    pose(refs, null);
};

const schedule = (refs: MotionRefs, ms: number, run: () => void) => {
    window.clearTimeout(refs.timer.current);
    refs.timer.current = window.setTimeout(run, ms);
};

const widthOf = (refs: MotionRefs): number => refs.top.current?.offsetWidth ?? 0;

/**
 * 拖動中：卡跟手指、按比例傾斜；向左拖推後面嘅卡上前，向右拖上一張卡由左邊探入。
 * 兩個方向都會露出後面嗰張卡，佢嘅節目名跟拖動進度淡入（--card-reveal）
 */
const drag = (refs: MotionRefs, dx: number) => {
    const el = refs.stack.current;
    // 飛緊（例如拖緊時撳咗方向鍵）就唔郁：清走落地 timer 會令 flying 永遠卡住
    if (!el || refs.flying.current) return;
    window.clearTimeout(refs.timer.current);
    const progress = dragProgress(dx, widthOf(refs));
    const rotate = prefersReducedMotion() ? 0 : cardRotation(dx);
    el.dataset.phase = 'dragging';
    el.style.setProperty('--card-dx', `${dx}px`);
    el.style.setProperty('--card-rotate', `${rotate}deg`);
    el.style.setProperty('--card-forward', String(dx < 0 ? progress : 0));
    el.style.setProperty('--card-return', String(dx > 0 ? progress * RETURN_PEEK_RATIO : 0));
    el.style.setProperty('--card-reveal', String(progress));
};

/** 彈緊返中間時張卡而家嘅橫向位移（computed transform）；唔係彈緊就係 0 */
const settlingOffset = (refs: MotionRefs): number => {
    const top = refs.top.current;
    if (!top || refs.stack.current?.dataset.phase !== 'settling') return 0;
    return translateXOf(getComputedStyle(top).transform);
};

/**
 * 彈返途中捉住張卡：停喺佢而家嘅位置（computed transform）繼續拖，唔會跳返中間；
 * 返回而家嘅橫向位移。唔係彈緊，或者已經差唔多返到中間（未過橫拖門檻，當係 tap）就係 null，照彈
 */
const grab = (refs: MotionRefs): number | null => {
    const dx = settlingOffset(refs);
    if (Math.abs(dx) < DRAG_INTENT_PX) return null;
    drag(refs, dx);
    return dx;
};

/** 飛走之後先轉節目；減少動畫就唔飛唔轉，即刻換 */
const fly = (refs: MotionRefs, direction: SwipeDirection, onLanded: () => void) => {
    refs.flight.current += 1;
    if (prefersReducedMotion()) {
        rest(refs);
        onLanded();
        return;
    }
    refs.flying.current = true;
    pose(refs, `fly-${direction}`);
    // 播放器狀態經 useSyncExternalStore 同步更新（microtask 內 render），
    // 所以即刻 rest() 都唔會有一格舊節目喺中間：新內容同歸位喺同一格畫面出現
    schedule(refs, CARD_FLY_MS, () => {
        onLanded();
        rest(refs);
    });
};

/**
 * 卡疊動畫：直接寫 CSS 變數 / data-phase 落 DOM，拖動時唔使每次 pointermove 都 re-render。
 * transform 同 transition 全部喺 ShowCardStack.module.css 按 data-phase 定義。
 */
export const useCardMotion = () => {
    const stackRef = useRef<HTMLDivElement>(null);
    const topRef = useRef<HTMLDivElement>(null);
    const timer = useRef<number | undefined>(undefined);
    const flying = useRef(false);
    const flight = useRef(0);
    useEffect(() => () => window.clearTimeout(timer.current), []);
    // 只喺事件 / timer 入面先組合 refs，render 期間唔讀 ref
    const refs = (): MotionRefs => ({ stack: stackRef, top: topRef, timer, flying, flight });
    return {
        stackRef,
        topRef,
        isFlying: () => flying.current,
        flightId: () => flight.current,
        width: () => widthOf(refs()),
        drag: (dx: number) => drag(refs(), dx),
        grab: () => grab(refs()),
        settlingOffset: () => settlingOffset(refs()),
        springBack: () => {
            // 飛緊就唔好清走落地 timer（否則 flying 永遠卡住）
            if (flying.current) return;
            pose(refs(), 'settling');
            schedule(refs(), CARD_SPRING_MS, () => rest(refs()));
        },
        fly: (direction: SwipeDirection, onLanded: () => void) => fly(refs(), direction, onLanded),
    };
};

export type CardMotion = ReturnType<typeof useCardMotion>;
