import { useEffect, type RefObject } from 'react';
import { cssMs } from '../../../../utils/cssTime';

/** 預設淡出時長 token（PlayerHandle.module.css .handle[data-leaving] 用同一個）；其他用法傳自己嘅 durationVar */
const FADE_DURATION_VAR = '--duration-page-handle-fade';

/**
 * 淡出緊嘅元素（把手、收藏 tab 舊內容）唔可以淨靠 animationend 先拆走（S-666）：
 * 動畫畀人 cancel（上層 display:none、減少動畫將 animation 改 none）就即刻拆；
 * 動畫根本冇開始（冇 animationcancel）就等 token 嘅時長做後備。
 * 時長由 :root 嘅 token 讀，唔另外寫一個毫秒數；讀唔到（token 唔見咗，animation 都會失效）就即刻拆
 */
export const useLeaveFallback = (
    ref: RefObject<HTMLElement | null>,
    leaving: boolean,
    onLeft: (() => void) | undefined,
    durationVar: string = FADE_DURATION_VAR,
) => {
    useEffect(() => {
        const element = ref.current;
        if (!leaving || !element || !onLeft) return undefined;
        // 只認把手自己嘅動畫，入面元素嘅動畫唔算
        const onCancel = (event: Event) => {
            if (event.target === element) onLeft();
        };
        element.addEventListener('animationcancel', onCancel);
        const token = getComputedStyle(document.documentElement).getPropertyValue(durationVar);
        const timer = window.setTimeout(onLeft, cssMs(token));
        return () => {
            element.removeEventListener('animationcancel', onCancel);
            window.clearTimeout(timer);
        };
    }, [ref, leaving, onLeft, durationVar]);
};
