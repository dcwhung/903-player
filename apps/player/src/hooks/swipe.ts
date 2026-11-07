/** 橫向移動至少咁多 px 先算 swipe */
export const SWIPE_THRESHOLD_PX = 48;

export type SwipeDirection = 'next' | 'previous';

/** 循環轉：最後一個之後係第一個，第一個之前係最後一個；得一個（或者冇）就唔郁 */
export const wrapIndex = (index: number, total: number, direction: SwipeDirection): number => {
    if (total <= 1) return index;
    const step = direction === 'next' ? 1 : -1;
    return (index + step + total) % total;
};

/** 向左掃 = 下一個，向右掃 = 上一個；太短或者主要係上下移動就唔算 */
export const swipeDirection = (dx: number, dy: number): SwipeDirection | null => {
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) {
        return null;
    }
    return dx < 0 ? 'next' : 'previous';
};

/** 拖動跟手指之前，至少要郁咁多 px 先睇得出係橫定直 */
export const DRAG_INTENT_PX = 10;

export type DragIntent = 'horizontal' | 'vertical';

/** 跟手指拖動用：橫向多過直向先算橫拖；直向就交返畀瀏覽器捲頁 */
export const dragIntent = (dx: number, dy: number): DragIntent | null => {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_INTENT_PX) {
        return null;
    }
    return Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
};

const ARROW_KEY_DIRECTION: Readonly<Record<string, SwipeDirection>> = {
    ArrowRight: 'next',
    ArrowLeft: 'previous',
};

/** 鍵盤代替 swipe：右方向鍵 = 下一個（等於向左掃），左方向鍵 = 上一個 */
export const arrowKeyDirection = (key: string): SwipeDirection | null =>
    ARROW_KEY_DIRECTION[key] ?? null;
