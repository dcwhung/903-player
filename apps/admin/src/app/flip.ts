/*
 * Nav 收合 / 展開嘅轉位 animation（mockup admin-style ⑨ FLIP）：撳掣之前記低 [data-flip] 元素位置，
 * 切 layout 之後由舊位置滑去新位置。用 Web Animations（transform），唔聽 animationend，
 * 播完自己消失；動畫開始嗰刻先讀 prefersReducedMotion()（設咗減少動態就直接切換）。
 * 時間 / easing 跟 tokens.css --motion-move / --motion-ease
 */
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { prefersReducedMotion } from '../utils/motion';

interface Box {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** 舊位置 − 新位置；未顯示（0 size）或者冇郁就 null */
export const flipOffset = (before: Box, after: Box): { dx: number; dy: number } | null => {
    if (!before.width || !before.height || !after.width || !after.height) return null;
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    return dx === 0 && dy === 0 ? null : { dx, dy };
};

const FALLBACK_MS = 220;
const FALLBACK_EASE = 'cubic-bezier(0.2, 0, 0, 1)';

const MS_PER_S = 1000;

/** CSS 時間 → ms（build 會將 220ms 壓成 .22s，兩種都要識） */
export const durationMs = (value: string): number | undefined => {
    const text = value.trim();
    const number = Number.parseFloat(text);
    if (!Number.isFinite(number)) return undefined;
    if (text.endsWith('ms')) return number;
    return text.endsWith('s') ? number * MS_PER_S : undefined;
};

const timing = (): KeyframeAnimationOptions => {
    const style = getComputedStyle(document.documentElement);
    const ms = durationMs(style.getPropertyValue('--motion-move'));
    const easing = style.getPropertyValue('--motion-ease').trim();
    return { duration: ms ?? FALLBACK_MS, easing: easing || FALLBACK_EASE };
};

const FLIPPING_CLASS = 'flipping';

/**
 * 掣由展開位置滑入 76px nav 時會出咗 nav 範圍：播緊嗰陣 nav 唔裁（.nav.flipping）。
 * 收返唔靠 animationend：全部 animation settle（播完 / 取消）或者超時就收，唔會卡住
 */
const showOverflowWhile = (
    nav: HTMLElement | null,
    animations: readonly Animation[],
    options: KeyframeAnimationOptions,
) => {
    if (!nav || animations.length === 0) return;
    nav.classList.add(FLIPPING_CLASS);
    const done = () => nav.classList.remove(FLIPPING_CLASS);
    const timeout = Number(options.duration ?? FALLBACK_MS) * 2;
    void Promise.race([
        Promise.allSettled(animations.map((animation) => animation.finished)),
        new Promise((resolve) => setTimeout(resolve, timeout)),
    ]).then(done);
};

const flipTargets = (root: HTMLElement | null) =>
    new Map(
        [...(root?.querySelectorAll<HTMLElement>('[data-flip]') ?? [])].map((el) => [
            el.dataset.flip ?? '',
            el,
        ]),
    );

/**
 * capture()：切 layout 之前叫（例如撳收合掣）；trigger 一變（mini）就播。
 * 冇 capture 過（例如視窗窄咗自動收合）就唔播
 */
export const useFlip = (root: RefObject<HTMLElement | null>, trigger: unknown) => {
    const before = useRef<Map<string, DOMRect> | null>(null);
    const capture = () => {
        before.current = new Map(
            [...flipTargets(root.current)].map(([key, el]) => [key, el.getBoundingClientRect()]),
        );
    };
    useLayoutEffect(() => {
        const old = before.current;
        before.current = null;
        if (!old || prefersReducedMotion()) return;
        const options = timing();
        const animations = [...flipTargets(root.current)].flatMap(([key, el]) => {
            const from = old.get(key);
            const offset = from && flipOffset(from, el.getBoundingClientRect());
            if (!offset || typeof el.animate !== 'function') return [];
            return [
                el.animate(
                    [
                        { transform: `translate(${offset.dx}px, ${offset.dy}px)` },
                        { transform: 'none' },
                    ],
                    options,
                ),
            ];
        });
        showOverflowWhile(root.current, animations, options);
    }, [root, trigger]);
    return capture;
};
