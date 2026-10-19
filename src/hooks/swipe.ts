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
