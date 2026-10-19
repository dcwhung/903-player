import { useMemo, useRef, type RefObject } from 'react';
import type { SwipeDirection } from '../../hooks/swipe';
import { prefersReducedMotion } from '../../utils/motion';
import { stripShift } from './dateStrip';

/** 拖緊碟跟住轉：每 px 0.5 度；轉集時碟再轉 120 度 */
const DISC_DEG_PER_PX = 0.5;
const DISC_SPIN_DEG = 120;

interface MotionRefs {
    track: RefObject<HTMLDivElement | null>;
    disc: RefObject<HTMLElement | null> | undefined;
    /** 日子條而家嘅位移（px） */
    offset: RefObject<number>;
    /** 碟累積轉咗幾多度（每次轉集加減 DISC_SPIN_DEG） */
    spin: RefObject<number>;
    /** 轉咗集之後，新日期要由邊度滑返中間（null = 直接歸位） */
    arriveFrom: RefObject<number | null>;
}

/** 寫 style：animate = 用返 CSS 嘅 transition，否則即刻跟手指 */
const setTransform = (el: HTMLElement | null | undefined, value: string, animate: boolean) => {
    if (!el) return;
    el.style.transition = animate ? '' : 'none';
    el.style.transform = value;
};

const moveTrack = (refs: MotionRefs, offset: number, animate: boolean) => {
    refs.offset.current = offset;
    setTransform(refs.track.current, `translateX(${offset}px)`, animate);
};

const turnDisc = (refs: MotionRefs, extra: number, animate: boolean) =>
    setTransform(refs.disc?.current, `rotate(${refs.spin.current + extra}deg)`, animate);

const follow = (refs: MotionRefs, offset: number) => {
    moveTrack(refs, offset, false);
    if (!prefersReducedMotion()) turnDisc(refs, offset * DISC_DEG_PER_PX, false);
};

const springBack = (refs: MotionRefs) => {
    refs.arriveFrom.current = null;
    moveTrack(refs, 0, true);
    turnDisc(refs, 0, true);
};

/**
 * 已經轉咗集（即刻播，唔等動畫）：碟轉一下，記低新日期要由邊度滑入嚟——
 * 新嘅中格就係舊嘅隔籬格，所以由「而家位移 − 一格距離」開始；減少動畫就唔滑唔轉
 */
const commit = (refs: MotionRefs, direction: SwipeDirection) => {
    if (prefersReducedMotion()) {
        refs.arriveFrom.current = null;
        return;
    }
    refs.spin.current += direction === 'next' ? -DISC_SPIN_DEG : DISC_SPIN_DEG;
    turnDisc(refs, 0, true);
    const width = refs.track.current?.clientWidth ?? 0;
    refs.arriveFrom.current = refs.offset.current - stripShift(width, direction);
};

/** 新日期 render 咗之後：由舊隔籬格位置即刻擺好，再 transition 返中間（FLIP） */
const arrive = (refs: MotionRefs) => {
    const from = refs.arriveFrom.current;
    refs.arriveFrom.current = null;
    if (from === null) {
        moveTrack(refs, 0, false);
        return;
    }
    moveTrack(refs, from, false);
    // 讀一次 layout，等瀏覽器先套用起點，下一步先會有 transition
    void refs.track.current?.offsetWidth;
    moveTrack(refs, 0, true);
};

/**
 * 日子條同唱片嘅動畫：直接寫 ref 嘅 style，拖緊唔會每次郁都 re-render。
 * 回傳嘅物件喺 spinRef 唔變時保持同一個（畀 effect 做 dependency）。
 */
export const useStripMotion = (spinRef?: RefObject<HTMLElement | null>) => {
    const track = useRef<HTMLDivElement>(null);
    const offset = useRef(0);
    const spin = useRef(0);
    const arriveFrom = useRef<number | null>(null);
    return useMemo(() => {
        const refs: MotionRefs = { track, disc: spinRef, offset, spin, arriveFrom };
        return {
            trackRef: track,
            follow: (dx: number) => follow(refs, dx),
            springBack: () => springBack(refs),
            commit: (direction: SwipeDirection) => commit(refs, direction),
            arrive: () => arrive(refs),
        };
    }, [spinRef]);
};

export type StripMotion = ReturnType<typeof useStripMotion>;
