/** 手指唔郁撳住咁耐，mini player 先浮起（之後左滑 = 關閉，唔再係轉節目） */
export const LONG_PRESS_MS = 500;
/** 浮起之後咁耐冇郁就變返平時 */
export const ARMED_IDLE_MS = 4000;
/** 拉過咁多 px 放手：停喺度露出「關閉」掣 */
export const REVEAL_MIN_PX = 40;
/** 「關閉」掣停定時，card 向左移咗幾多 px（同 --mini-dismiss-reveal 一致） */
export const REVEAL_PX = 88;
/** 拉過 card 闊度咁多放手：直接關閉 */
export const DISMISS_RATIO = 0.5;
/** 關閉時 card 滑走嘅時間（同 --mini-dismiss-slide-ms 一致） */
export const DISMISS_SLIDE_MS = 200;

/** 放手之後：關閉 / 停喺度露出關閉掣 / 收返 */
export type DismissOutcome = 'dismiss' | 'reveal' | 'collapse';

/** card 向左移咗幾多 px：由按低時嘅位置（from）跟手指（dx，負數 = 向左），唔超過原位同 card 闊度 */
export const dismissOffset = (from: number, dx: number, width: number): number =>
    Math.min(Math.max(width, 0), Math.max(0, from - dx));

/** 放手時決定：過一半闊度關閉，拉咗少少就停喺度露出掣，太少就收返 */
export const dismissOutcome = (offset: number, width: number): DismissOutcome => {
    if (width > 0 && offset >= width * DISMISS_RATIO) return 'dismiss';
    return offset >= REVEAL_MIN_PX ? 'reveal' : 'collapse';
};
