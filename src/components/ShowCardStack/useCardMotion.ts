import { useEffect, useRef, type RefObject } from 'react';
import type { SwipeDirection } from '../../hooks/swipe';
import { prefersReducedMotion } from '../../utils/motion';
import {
    CARD_FLY_MS,
    CARD_SPRING_MS,
    RETURN_PEEK_RATIO,
    cardRotation,
    dragProgress,
} from './cardStack';

/** 卡疊做緊乜（寫喺 data-phase）；冇 data-phase = 靜止，冇 transition */
type CardPhase = 'dragging' | 'settling' | `fly-${SwipeDirection}`;

/** 拖動姿勢嘅 CSS 變數；清走就返去 CSS 預設（或者 data-phase 嘅飛走位置） */
const POSE_VARS = ['--card-dx', '--card-rotate', '--card-forward', '--card-return'] as const;

interface MotionRefs {
    stack: RefObject<HTMLDivElement | null>;
    top: RefObject<HTMLDivElement | null>;
    timer: RefObject<number | undefined>;
    flying: RefObject<boolean>;
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

/** 拖動中：卡跟手指、按比例傾斜；向左拖推後面嘅卡上前，向右拖上一張卡由左邊探入 */
const drag = (refs: MotionRefs, dx: number) => {
    const el = refs.stack.current;
    if (!el) return;
    window.clearTimeout(refs.timer.current);
    const progress = dragProgress(dx, widthOf(refs));
    const rotate = prefersReducedMotion() ? 0 : cardRotation(dx);
    el.dataset.phase = 'dragging';
    el.style.setProperty('--card-dx', `${dx}px`);
    el.style.setProperty('--card-rotate', `${rotate}deg`);
    el.style.setProperty('--card-forward', String(dx < 0 ? progress : 0));
    el.style.setProperty('--card-return', String(dx > 0 ? progress * RETURN_PEEK_RATIO : 0));
};

/** 飛走之後先轉節目；減少動畫就唔飛唔轉，即刻換 */
const fly = (refs: MotionRefs, direction: SwipeDirection, onLanded: () => void) => {
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
    useEffect(() => () => window.clearTimeout(timer.current), []);
    // 只喺事件 / timer 入面先組合 refs，render 期間唔讀 ref
    const refs = (): MotionRefs => ({ stack: stackRef, top: topRef, timer, flying });
    return {
        stackRef,
        topRef,
        isFlying: () => flying.current,
        width: () => widthOf(refs()),
        drag: (dx: number) => drag(refs(), dx),
        springBack: () => {
            pose(refs(), 'settling');
            schedule(refs(), CARD_SPRING_MS, () => rest(refs()));
        },
        fly: (direction: SwipeDirection, onLanded: () => void) => fly(refs(), direction, onLanded),
    };
};

export type CardMotion = ReturnType<typeof useCardMotion>;
