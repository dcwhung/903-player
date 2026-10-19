import { useRef, type PointerEvent } from 'react';
import { swipeDirection, type SwipeDirection } from './swipe';

/** 喺一個區域偵測左右掃（pointer events，滑鼠同手指都得） */
export const useSwipe = (onSwipe: (direction: SwipeDirection) => void) => {
    const start = useRef<{ x: number; y: number } | null>(null);
    return {
        onPointerDown: (event: PointerEvent<HTMLElement>) => {
            start.current = { x: event.clientX, y: event.clientY };
        },
        onPointerUp: (event: PointerEvent<HTMLElement>) => {
            if (!start.current) return;
            const direction = swipeDirection(
                event.clientX - start.current.x,
                event.clientY - start.current.y,
            );
            start.current = null;
            if (direction) onSwipe(direction);
        },
        onPointerCancel: () => {
            start.current = null;
        },
    };
};

/** 由 swipe 方向計新 index；去到盡頭就唔郁（唔會循環） */
export const stepIndex = (index: number, total: number, direction: SwipeDirection): number => {
    const next = direction === 'next' ? index + 1 : index - 1;
    return Math.min(total - 1, Math.max(0, next));
};
