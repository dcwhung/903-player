import { useEffect, useMemo, useRef, type RefObject } from 'react';
import type { SwipeDirection } from '../../hooks/swipe';
import { prefersReducedMotion } from '../../utils/motion';
import { stripShift } from './dateStrip';

/** 同 tokens.css 嘅 --duration-strip 一致：滑完先真係轉集 */
const STRIP_SETTLE_MS = 300;
/** 拖緊碟跟住轉：每 px 0.5 度；轉集時碟再轉 120 度 */
const DISC_DEG_PER_PX = 0.5;
const DISC_SPIN_DEG = 120;

interface MotionRefs {
    track: RefObject<HTMLDivElement | null>;
    disc: RefObject<HTMLElement | null> | undefined;
    /** 碟累積轉咗幾多度（每次轉集加減 DISC_SPIN_DEG） */
    spin: RefObject<number>;
    pending: RefObject<{ timer: number; done: () => void } | null>;
}

/** 寫 style：animate = 用返 CSS 嘅 transition，否則即刻跟手指 */
const setTransform = (el: HTMLElement | null | undefined, value: string, animate: boolean) => {
    if (!el) return;
    el.style.transition = animate ? '' : 'none';
    el.style.transform = value;
};

const moveTrack = (refs: MotionRefs, offset: number, animate: boolean) =>
    setTransform(refs.track.current, `translateX(${offset}px)`, animate);

const turnDisc = (refs: MotionRefs, extra: number, animate: boolean) =>
    setTransform(refs.disc?.current, `rotate(${refs.spin.current + extra}deg)`, animate);

/** 未滑完又再郁（或者滑完）：即刻完成上一次轉集 */
const flush = (refs: MotionRefs) => {
    const job = refs.pending.current;
    refs.pending.current = null;
    if (!job) return;
    window.clearTimeout(job.timer);
    job.done();
};

const follow = (refs: MotionRefs, offset: number) => {
    moveTrack(refs, offset, false);
    if (!prefersReducedMotion()) turnDisc(refs, offset * DISC_DEG_PER_PX, false);
};

const springBack = (refs: MotionRefs) => {
    moveTrack(refs, 0, true);
    turnDisc(refs, 0, true);
};

/** 轉集：滑去隔籬格 + 碟轉一下，滑完先叫 done；減少動畫就即刻轉、碟唔轉 */
const commit = (refs: MotionRefs, direction: SwipeDirection, done: () => void) => {
    flush(refs);
    if (prefersReducedMotion()) {
        moveTrack(refs, 0, false);
        done();
        return;
    }
    refs.spin.current += direction === 'next' ? -DISC_SPIN_DEG : DISC_SPIN_DEG;
    moveTrack(refs, stripShift(refs.track.current?.clientWidth ?? 0, direction), true);
    turnDisc(refs, 0, true);
    refs.pending.current = { timer: window.setTimeout(() => flush(refs), STRIP_SETTLE_MS), done };
};

/**
 * 日子條同唱片嘅動畫：直接寫 ref 嘅 style，拖緊唔會每次郁都 re-render。
 * 回傳嘅物件喺 spinRef 唔變時保持同一個（畀 effect 做 dependency）。
 */
export const useStripMotion = (spinRef?: RefObject<HTMLElement | null>) => {
    const track = useRef<HTMLDivElement>(null);
    const spin = useRef(0);
    const pending = useRef<MotionRefs['pending']['current']>(null);
    useEffect(() => () => window.clearTimeout(pending.current?.timer), []);
    return useMemo(() => {
        const refs: MotionRefs = { track, disc: spinRef, spin, pending };
        return {
            trackRef: track,
            flush: () => flush(refs),
            follow: (offset: number) => follow(refs, offset),
            springBack: () => springBack(refs),
            commit: (direction: SwipeDirection, done: () => void) => commit(refs, direction, done),
            // 新日期 render 咗之後即刻歸位（冇 transition），唔會見到舊日期閃返出嚟
            settle: () => moveTrack(refs, 0, false),
        };
    }, [spinRef]);
};

export type StripMotion = ReturnType<typeof useStripMotion>;
