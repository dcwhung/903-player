/** html 上面 useViewportGap 寫入嘅變數（iOS standalone viewport 矮過螢幕幾多） */
const VIEWPORT_GAP_VAR = '--viewport-gap-bottom';
/** mini player 用 portal 掛喺 body，外層係 ThemeScope（data-theme-scope）；debug panel 自己冇呢個屬性 */
const MINI_PLAYER_SELECTOR = ':scope > [data-theme-scope]';
const PX_DECIMALS = 1;

interface SafeArea {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface ViewportSnapshot {
    innerWidth: number;
    innerHeight: number;
    screenWidth: number;
    screenHeight: number;
    visualViewportHeight?: number;
    devicePixelRatio: number;
    /** iOS 先有（主畫面 app = true） */
    standalone?: boolean;
    safeArea: SafeArea;
    /** 原文（例如「55px」），未設就係空字串 */
    viewportGapBottom: string;
    /** --mini-player-offset-bottom 計出嚟幾多 px */
    miniPlayerOffsetPx: number;
    /** mini player 卡底離 window 底幾遠；冇 mini player 就冇 */
    miniPlayerGapPx?: number;
}

const px = (value: string): number => parseFloat(value) || 0;
const round = (value: number): number => Number(value.toFixed(PX_DECIMALS));

/** probe（ViewportDebug.module.css .probe）：padding 係四邊安全區，闊度係 mini player 卡底距離 */
const readProbe = (probe: HTMLElement) => {
    const style = getComputedStyle(probe);
    return {
        safeArea: {
            top: px(style.paddingTop),
            right: px(style.paddingRight),
            bottom: px(style.paddingBottom),
            left: px(style.paddingLeft),
        },
        miniPlayerOffsetPx: px(style.width),
    };
};

const miniPlayerGap = (): number | undefined => {
    const mini = document.body.querySelector(MINI_PLAYER_SELECTOR);
    return mini ? round(window.innerHeight - mini.getBoundingClientRect().bottom) : undefined;
};

/** 而家 viewport 嘅尺寸、安全區同 mini player 位置（debug 用） */
export const readViewport = (probe: HTMLElement): ViewportSnapshot => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    visualViewportHeight: window.visualViewport?.height,
    devicePixelRatio: window.devicePixelRatio,
    standalone: (navigator as Navigator & { standalone?: boolean }).standalone,
    viewportGapBottom: getComputedStyle(document.documentElement)
        .getPropertyValue(VIEWPORT_GAP_VAR)
        .trim(),
    miniPlayerGapPx: miniPlayerGap(),
    ...readProbe(probe),
});

const orNa = (value: unknown): string => (value === undefined ? 'n/a' : String(value));

/** 每行 [名, 值]（英文字，debug 用） */
export const metricRows = (s: ViewportSnapshot): [string, string][] => [
    ['innerWidth × innerHeight', `${s.innerWidth} × ${s.innerHeight}`],
    ['screen width × height', `${s.screenWidth} × ${s.screenHeight}`],
    ['visualViewport.height', orNa(s.visualViewportHeight)],
    ['devicePixelRatio', String(s.devicePixelRatio)],
    ['navigator.standalone', orNa(s.standalone)],
    [
        'safe-area top / right / bottom / left',
        [s.safeArea.top, s.safeArea.right, s.safeArea.bottom, s.safeArea.left].join(' / '),
    ],
    ['--viewport-gap-bottom', s.viewportGapBottom || 'unset'],
    ['--mini-player-offset-bottom', String(s.miniPlayerOffsetPx)],
    [
        'mini player gap to bottom',
        s.miniPlayerGapPx === undefined ? 'no mini player' : String(s.miniPlayerGapPx),
    ],
];
