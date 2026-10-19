/** 橫向移動至少咁多 px 先算 swipe */
export const SWIPE_THRESHOLD_PX = 48;

export type SwipeDirection = 'next' | 'previous';

/** 向左掃 = 下一個，向右掃 = 上一個；太短或者主要係上下移動就唔算 */
export const swipeDirection = (dx: number, dy: number): SwipeDirection | null => {
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) {
        return null;
    }
    return dx < 0 ? 'next' : 'previous';
};

const ARROW_KEY_DIRECTION: Readonly<Record<string, SwipeDirection>> = {
    ArrowRight: 'next',
    ArrowLeft: 'previous',
};

/** 鍵盤代替 swipe：右方向鍵 = 下一個（等於向左掃），左方向鍵 = 上一個 */
export const arrowKeyDirection = (key: string): SwipeDirection | null =>
    ARROW_KEY_DIRECTION[key] ?? null;
