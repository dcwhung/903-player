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

/*
 * iPhone Duo / HomeView（P10，v2.0.0，_mockups_/iphone-duo、_mockups_/home-view）。
 * 新版面只喺呢啲範圍生效：現有手機直 / 橫、平板直 / 橫、電腦橫版（e2e/visualModel.mjs 凍結清單）一個都唔 match，
 * 上面三句現有斷點唔改（src/styles/deviceQueries.node.test.ts 鎖住）。
 * 範圍同時包 Progressier simulator 實測值同佢 FAQ 寫嘅值；尺寸係全屏（安裝咗嘅 PWA）量嘅，
 * 喺 Safari 分頁開（工具列食咗高度）會跌出範圍，退返現有版面。
 */

/** Duo 闔上・直（實測 426×612，FAQ 466×678） */
export const DUO_COVER_PORTRAIT_QUERY =
    '(orientation: portrait) and (min-width: 420px) and (max-width: 470px) and (min-height: 590px) and (max-height: 690px)';

/**
 * Duo 闔上・橫 / Standing（實測 612×426）同 Seated 上半（612×438）：窄過 LANDSCAPE_QUERY 嘅 640px，
 * 本來會出直版；呢個範圍入返手機打橫版面（CSS 由 scripts/postcssDuoLandscape.ts 喺 build 時複製橫版區塊）
 */
export const DUO_COVER_LANDSCAPE_QUERY =
    '(orientation: landscape) and (min-width: 600px) and (max-width: 639px) and (max-height: 450px)';

/** Duo 打開・橫（實測 876×612，FAQ 890×626；摺位喺正中） */
export const DUO_OPEN_LANDSCAPE_QUERY =
    '(orientation: landscape) and (min-width: 860px) and (max-width: 900px) and (min-height: 600px) and (max-height: 640px)';

/** Duo 打開・直（實測 612×876；摺位喺正中） */
export const DUO_OPEN_PORTRAIT_QUERY =
    '(orientation: portrait) and (min-width: 600px) and (max-width: 640px) and (min-height: 860px) and (max-height: 900px)';

/** HomeView 方形螢幕（假設 544×544） */
export const SQUARE_QUERY =
    '(min-width: 520px) and (max-width: 568px) and (min-height: 520px) and (max-height: 568px)';

/** Duo 任何一種姿勢（四邊多留邊框） */
export const DUO_QUERY = [
    DUO_COVER_PORTRAIT_QUERY,
    DUO_COVER_LANDSCAPE_QUERY,
    DUO_OPEN_LANDSCAPE_QUERY,
    DUO_OPEN_PORTRAIT_QUERY,
].join(', ');

/** Duo 打橫（闔上・橫 / 打開・橫）：橫版兩欄嘅頁，貼邊嘅表要伸返出邊框 */
export const DUO_LANDSCAPE_QUERY = `${DUO_COVER_LANDSCAPE_QUERY}, ${DUO_OPEN_LANDSCAPE_QUERY}`;

/** 新主頁（左橫額 + 疊卡、右播放卡）：Duo 打開・橫 + HomeView */
export const SHELF_SPLIT_QUERY = `${DUO_OPEN_LANDSCAPE_QUERY}, ${SQUARE_QUERY}`;

/** 行橫版版面（JS 用）：現有橫版，或者 Duo 闔上・橫。現有裝置結果同 LANDSCAPE_QUERY 一樣 */
export const LANDSCAPE_LAYOUT_QUERY = `${LANDSCAPE_QUERY}, ${DUO_COVER_LANDSCAPE_QUERY}`;

/** 行手機打橫版面（JS 用）：現有手機打橫，或者 Duo 闔上・橫。現有裝置結果同 SHORT_LANDSCAPE_QUERY 一樣 */
export const SHORT_LANDSCAPE_LAYOUT_QUERY = `${SHORT_LANDSCAPE_QUERY}, ${DUO_COVER_LANDSCAPE_QUERY}`;
