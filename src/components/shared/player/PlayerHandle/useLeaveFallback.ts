import { useEffect, type RefObject } from 'react';
import { cssMs } from '../../../../utils/cssTime';

/** 淡出動畫嘅時長 token（PlayerHandle.module.css .handle[data-leaving] 用同一個） */
const FADE_DURATION_VAR = '--duration-page-handle-fade';

/**
 * 淡出緊嘅把手唔可以淨靠 animationend 先拆走（S-666）：
 * 動畫畀人 cancel（上層 display:none、減少動畫將 animation 改 none）就即刻拆；
 * 動畫根本冇開始（冇 animationcancel）就等 token 嘅時長做後備。
 * 時長由 :root 嘅 token 讀，唔另外寫一個毫秒數；讀唔到（token 唔見咗，animation 都會失效）就即刻拆
 */
export const useLeaveFallback = (
    ref: RefObject<HTMLElement | null>,
    leaving: boolean,
    onLeft: (() => void) | undefined,
) => {
    useEffect(() => {
        const element = ref.current;
        if (!leaving || !element || !onLeft) return undefined;
        // 只認把手自己嘅動畫，入面元素嘅動畫唔算
        const onCancel = (event: Event) => {
            if (event.target === element) onLeft();
        };
        element.addEventListener('animationcancel', onCancel);
        const token = getComputedStyle(document.documentElement).getPropertyValue(
            FADE_DURATION_VAR,
        );
        const timer = window.setTimeout(onLeft, cssMs(token));
        return () => {
            element.removeEventListener('animationcancel', onCancel);
            window.clearTimeout(timer);
        };
    }, [ref, leaving, onLeft]);
};
