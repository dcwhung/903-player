/** 量 viewport 底同螢幕底差幾多所需嘅狀態 */
export interface ViewportMetrics {
    /** iOS 主畫面 app（navigator.standalone，冇瀏覽器工具列） */
    standalone: boolean;
    portrait: boolean;
    /** screen.height：iOS 永遠係直向螢幕高（CSS px） */
    screenHeight: number;
    innerHeight: number;
}

/**
 * iOS standalone 嘅 viewport 有時矮過螢幕（實機量到約 55px，大約係頂部安全區高），
 * 超過呢個數就唔係呢個 bug（例如開咗鍵盤），唔好扣減 mini player 卡底距離
 */
const MAX_VIEWPORT_GAP_PX = 80;

/**
 * viewport 底離螢幕底幾遠（px）：只計 iOS standalone 直向；瀏覽器分頁有工具列、
 * 橫向時 screen.height 仍然係直向高度，兩樣都唔準，當 0
 */
export const viewportGap = ({
    standalone,
    portrait,
    screenHeight,
    innerHeight,
}: ViewportMetrics): number => {
    if (!standalone || !portrait) return 0;
    const gap = Math.round(screenHeight - innerHeight);
    return gap > 0 && gap <= MAX_VIEWPORT_GAP_PX ? gap : 0;
};
