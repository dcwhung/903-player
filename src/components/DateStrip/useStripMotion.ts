import { useMemo, useRef, type RefObject } from 'react';
import type { SwipeDirection } from '../../hooks/swipe';
import { prefersReducedMotion } from '../../utils/motion';
import { nearestTurn, rotationOf, stripShift, uprightSpin } from './dateStrip';

/** 拖緊碟跟住轉：每 px 0.5 度；轉集時碟順時針轉返正（uprightSpin） */
const DISC_DEG_PER_PX = 0.5;
/** 滑入起點：值係轉集方向，新格用側格樣式（DateStrip.module.css），拎走就 transition 返正常樣式 */
const ARRIVING_ATTR = 'data-arriving';

interface MotionRefs {
    track: RefObject<HTMLDivElement | null>;
    disc: RefObject<HTMLElement | null> | undefined;
    /** 日子條而家嘅位移（px） */
    offset: RefObject<number>;
    /** 碟累積轉咗幾多度（每次轉集轉去下一個 360 倍數） */
    spin: RefObject<number>;
    /** 拖緊碟額外轉咗幾多度（未加入 spin） */
    drag: RefObject<number>;
    /** 轉咗集之後，新日期要由邊度滑返中間（null = 直接歸位） */
    arriveFrom: RefObject<number | null>;
    /** 轉去邊個方向：滑入時得嗰邊新出現嘅側格要淡入 */
    arriveDirection: RefObject<SwipeDirection>;
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

const turnDisc = (refs: MotionRefs, extra: number, animate: boolean) => {
    refs.drag.current = extra;
    setTransform(refs.disc?.current, `rotate(${refs.spin.current + extra}deg)`, animate);
};

/**
 * 開始拖：碟可能仲轉緊（轉集轉返正 / 彈返），inline style 係目標角度，畫面上未到。
 * 讀畫面上嘅角度做新起點（揀同佢睇落一樣、最接近目標嘅角度），之後跟手指唔會跳；
 * 讀唔到（例如冇 transform）就照舊由目標角度開始
 */
const grab = (refs: MotionRefs) => {
    const disc = refs.disc?.current;
    if (!disc || prefersReducedMotion()) return;
    const angle = rotationOf(getComputedStyle(disc).transform);
    if (angle === null) return;
    refs.spin.current = nearestTurn(angle, refs.spin.current + refs.drag.current);
    turnDisc(refs, 0, false);
};

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
 * 已經轉咗集（即刻播，唔等動畫）：碟由而家角度（連拖動）順時針慢慢轉返正，
 * 記低新日期要由邊度滑入嚟——新嘅中格就係舊嘅隔籬格，所以由「而家位移 − 一格距離」開始；
 * 減少動畫就唔滑唔轉
 */
const commit = (refs: MotionRefs, direction: SwipeDirection) => {
    if (prefersReducedMotion()) {
        refs.arriveFrom.current = null;
        return;
    }
    refs.spin.current = uprightSpin(refs.spin.current + refs.drag.current);
    turnDisc(refs, 0, true);
    const width = refs.track.current?.clientWidth ?? 0;
    refs.arriveFrom.current = refs.offset.current - stripShift(width, direction);
    refs.arriveDirection.current = direction;
};

/**
 * 新日期 render 咗之後：由舊隔籬格位置即刻擺好，再 transition 返中間（FLIP）。
 * 起點同時套用側格樣式（細字、淡色、冇「現正播放：」），一路滑一路變返中格樣式，
 * 唔會一開頭就由細字跳做大字
 */
const arrive = (refs: MotionRefs) => {
    const from = refs.arriveFrom.current;
    refs.arriveFrom.current = null;
    const track = refs.track.current;
    if (from === null) {
        moveTrack(refs, 0, false);
        return;
    }
    track?.setAttribute(ARRIVING_ATTR, refs.arriveDirection.current);
    moveTrack(refs, from, false);
    // 讀一次 layout，等瀏覽器先套用起點，下一步先會有 transition
    void track?.offsetWidth;
    track?.removeAttribute(ARRIVING_ATTR);
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
    const drag = useRef(0);
    const arriveFrom = useRef<number | null>(null);
    const arriveDirection = useRef<SwipeDirection>('next');
    return useMemo(() => {
        const refs: MotionRefs = {
            track,
            disc: spinRef,
            offset,
            spin,
            drag,
            arriveFrom,
            arriveDirection,
        };
        return {
            trackRef: track,
            grab: () => grab(refs),
            follow: (dx: number) => follow(refs, dx),
            springBack: () => springBack(refs),
            commit: (direction: SwipeDirection) => commit(refs, direction),
            arrive: () => arrive(refs),
        };
    }, [spinRef]);
};

export type StripMotion = ReturnType<typeof useStripMotion>;
