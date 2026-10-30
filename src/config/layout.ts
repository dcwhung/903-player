/**
 * 橫版斷點（CSS @media 用唔到變數，所以 CSS 要寫返同一句；src/styles/landscapeBreakpoint.node.test.ts 鎖住）。
 * 打橫而且夠闊（≥ 640px）先轉橫版：節目頁 / 今日節目頁左播放器、右清單；主頁節目格一頁放晒。
 */
export const LANDSCAPE_QUERY = '(orientation: landscape) and (min-width: 640px)';

/**
 * 手機打橫（橫版而且 ≤ 561px 高，同直版矮螢幕斷點 SHORT_HEIGHT_PX 一樣）：
 * 主頁橫額入格（5 欄 × 2 行），今日節目頁指示點搬上頁頭
 */
export const SHORT_LANDSCAPE_QUERY = `${LANDSCAPE_QUERY} and (max-height: 561px)`;

/** 橫版但唔係手機打橫（細視窗、桌面、iPad）：主頁橫額成行，用闊版橫額圖 */
export const WIDE_BANNER_QUERY = `${LANDSCAPE_QUERY} and (min-height: 562px)`;

/** 闊橫版主頁播放卡夠高（≥ 700px）先多「下一集」清單（mockup TALL_H） */
export const TALL_CARD_QUERY = '(min-height: 700px)';
