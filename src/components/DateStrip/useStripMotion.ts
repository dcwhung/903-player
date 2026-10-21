import { useMemo, useRef, type RefObject } from 'react';
import { prefersReducedMotion } from '../../utils/motion';
import { behindTurn, rotationOf, trackTransform, uprightSpin } from './dateStrip';

/** 拖緊碟跟住轉：每 px 0.5 度；轉集時碟順時針轉返正（uprightSpin） */
const DISC_DEG_PER_PX = 0.5;

interface MotionRefs {
    track: RefObject<HTMLDivElement | null>;
    disc: RefObject<HTMLElement | null> | undefined;
    /** 擺喺正中嗰日（現正播放）嘅 index */
    current: RefObject<number>;
    /** 日子條而家嘅拖動位移（px） */
    offset: RefObject<number>;
    /** 碟嘅目標角度：一定係 360 倍數（擺正），每次轉集轉去下一個 */
    spin: RefObject<number>;
    /** 碟而家喺目標以外額外轉咗幾多度（捉住嗰下嘅差 + 拖動） */
    drag: RefObject<number>;
    /** 開始拖時碟仲未轉到目標：畫面上角度同目標嘅差（≤ 0），彈返 / 轉集就清走 */
    grabbed: RefObject<number>;
}

/** 寫 style：animate = 用返 CSS 嘅 transition，否則即刻跟手指 */
const setTransform = (el: HTMLElement | null | undefined, value: string, animate: boolean) => {
    if (!el) return;
    el.style.transition = animate ? '' : 'none';
    el.style.transform = value;
};

const moveTrack = (refs: MotionRefs, offset: number, animate: boolean) => {
    refs.offset.current = offset;
    setTransform(refs.track.current, trackTransform(refs.current.current, offset), animate);
};

const turnDisc = (refs: MotionRefs, extra: number, animate: boolean) => {
    refs.drag.current = extra;
    setTransform(refs.disc?.current, `rotate(${refs.spin.current + extra}deg)`, animate);
};

/**
 * 開始拖：碟可能仲轉緊（轉集轉返正 / 彈返），inline style 係目標角度，畫面上未到。
 * 讀畫面上嘅角度，記低同目標差幾多（grabbed），之後跟手指由嗰度開始唔會跳；
 * 目標（spin）唔變，所以彈返照樣順時針轉返正。讀唔到（例如冇 transform）就照舊由目標開始
 */
const grab = (refs: MotionRefs) => {
    const disc = refs.disc?.current;
    if (!disc || prefersReducedMotion()) return;
    const angle = rotationOf(getComputedStyle(disc).transform);
    if (angle === null) return;
    refs.grabbed.current = behindTurn(angle, refs.spin.current) - refs.spin.current;
    turnDisc(refs, refs.grabbed.current, false);
};

const follow = (refs: MotionRefs, offset: number) => {
    moveTrack(refs, offset, false);
    if (!prefersReducedMotion()) {
        turnDisc(refs, refs.grabbed.current + offset * DISC_DEG_PER_PX, false);
    }
};

/** 放手但冇轉集：成條 animate 返正中（現正播放嗰日），碟轉返正 */
const springBack = (refs: MotionRefs) => {
    refs.grabbed.current = 0;
    moveTrack(refs, 0, true);
    turnDisc(refs, 0, true);
};

/** 已經轉咗集（即刻播，唔等動畫）：碟由而家角度（連拖動）順時針慢慢轉返正；減少動畫就唔轉 */
const commit = (refs: MotionRefs) => {
    if (prefersReducedMotion()) return;
    refs.spin.current = uprightSpin(refs.spin.current + refs.drag.current);
    refs.grabbed.current = 0;
    turnDisc(refs, 0, true);
};

/**
 * 現正播放轉咗（拖 / 撳 / 方向鍵 / 撳清單）：成條由畫面上嘅位置 animate 去新嗰日正中。
 * 所有日子一直喺同一條 track 上面，只係改目標位置，唔使 FLIP；第一次 render 唔使 animate
 */
const settle = (refs: MotionRefs, current: number, animate: boolean) => {
    refs.current.current = current;
    moveTrack(refs, 0, animate && !prefersReducedMotion());
};

/**
 * 日子條同唱片嘅動畫：直接寫 ref 嘅 style，拖緊唔會每次郁都 re-render。
 * 回傳嘅物件喺 spinRef 唔變時保持同一個（畀 effect 做 dependency）。
 */
export const useStripMotion = (spinRef?: RefObject<HTMLElement | null>) => {
    const track = useRef<HTMLDivElement>(null);
    const current = useRef(0);
    const offset = useRef(0);
    const spin = useRef(0);
    const drag = useRef(0);
    const grabbed = useRef(0);
    return useMemo(() => {
        const refs: MotionRefs = { track, disc: spinRef, current, offset, spin, drag, grabbed };
        return {
            trackRef: track,
            grab: () => grab(refs),
            follow: (dx: number) => follow(refs, dx),
            springBack: () => springBack(refs),
            commit: () => commit(refs),
            settle: (index: number, animate: boolean) => settle(refs, index, animate),
        };
    }, [spinRef]);
};

export type StripMotion = ReturnType<typeof useStripMotion>;
