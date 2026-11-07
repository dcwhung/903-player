import { useRef, type MouseEvent, type PointerEvent } from 'react';
import { swipeDirection, type SwipeDirection, wrapIndex } from './swipe';

/**
 * 掃完 / 拖完之後瀏覽器仍然會喺放手嗰粒掣度發 click，所以要喺 capture 階段食咗佢。
 * `arm(true)` 代表啱啱掃過；下一下 click 會被食咗（只食一下）。
 */
export const useClickSuppression = () => {
    const armed = useRef(false);
    return {
        arm: (value: boolean) => {
            armed.current = value;
        },
        onClickCapture: (event: MouseEvent<HTMLElement>) => {
            const swiped = armed.current;
            armed.current = false;
            // 鍵盤 / 輔助技術觸發嘅 click（detail 0）一定唔係 swipe；
            // 觸控 swipe 之後通常冇 click，flag 會留低，唔可以食咗下一下鍵盤操作
            if (!swiped || event.detail === 0) return;
            event.preventDefault();
            event.stopPropagation();
        },
    };
};

/**
 * 喺一個區域偵測左右掃（pointer events，滑鼠同手指都得）。
 * 掃完嘅 click 會被食咗，否則 mini player 會跳頁、播放掣會暫停 / 播放。
 */
export const useSwipe = (onSwipe: (direction: SwipeDirection) => void) => {
    const start = useRef<{ x: number; y: number } | null>(null);
    const clicks = useClickSuppression();
    return {
        onPointerDown: (event: PointerEvent<HTMLElement>) => {
            start.current = { x: event.clientX, y: event.clientY };
            clicks.arm(false);
        },
        onPointerUp: (event: PointerEvent<HTMLElement>) => {
            if (!start.current) return;
            const direction = swipeDirection(
                event.clientX - start.current.x,
                event.clientY - start.current.y,
            );
            start.current = null;
            clicks.arm(direction !== null);
            if (direction) onSwipe(direction);
        },
        onPointerCancel: () => {
            start.current = null;
        },
        onClickCapture: clicks.onClickCapture,
    };
};

export interface StepIndexOptions {
    /** 去到盡頭循環返另一頭（同今日節目卡疊一樣）；預設唔循環 */
    wrap?: boolean;
}

/** 由 swipe 方向計新 index；預設去到盡頭就唔郁，`wrap` 就循環 */
export const stepIndex = (
    index: number,
    total: number,
    direction: SwipeDirection,
    { wrap = false }: StepIndexOptions = {},
): number => {
    // 循環邏輯用返卡疊嗰個，兩邊行為先唔會走樣
    if (wrap) return wrapIndex(index, total, direction);
    const next = direction === 'next' ? index + 1 : index - 1;
    return Math.min(total - 1, Math.max(0, next));
};
