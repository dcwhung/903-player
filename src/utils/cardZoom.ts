import {
    canViewTransition,
    isViewTransitionPending,
    retargetViewTransition,
    withViewTransition,
    type ViewTransitionKind,
} from './viewTransition';
import { zoomInset, type ZoomInset } from './zoomInset';

/**
 * 主頁格仔 zoom 入內頁（Z3，_mockups_/card-zoom）：
 * 撳格仔嗰刻量格仔框寫入 html 嘅 --zoom-inset-*，格仔標 data-zoom-source（global.css 先畀佢 zoom-tile 名），
 * 內頁由嗰個框開窗咁展開；窄版返主頁（unzoom）縮返入同一格。過場完就清走標記同框。
 * 由邊格入嚟綁喺入頁嗰個 history entry（location.state 嘅 zoomFrom，W-527）：
 * 系統返回、mini player 入頁嘅 entry 自然冇，返回就直接轉頁。
 * 闊橫版（_mockups_/card-zoom-wide）入頁 / 返回可以用 zoom-handle / unzoom-handle：同時卡 ↔ 內頁把手變形
 */

/** 入頁款式：淨係 zoom，或者連埋卡縮入內頁把手 */
export type ZoomKind = Extract<ViewTransitionKind, 'zoom' | 'zoom-handle'>;

/** 返主頁款式：淨係 unzoom，或者連埋內頁把手放大返做卡 */
export type UnzoomKind = Extract<ViewTransitionKind, 'unzoom' | 'unzoom-handle'>;

/** 每格嘅 data-zoom-key：用穩定 key（唔係排位），返主頁先搵得返同一格 */
export const zoomKey = {
    show: (id: string) => `show:${id}`,
    drama: (id: string) => `drama:${id}`,
    today: 'today',
} as const;

const KEY_ATTR = 'data-zoom-key';
const SOURCE_ATTR = 'data-zoom-source';
const SIDES = ['top', 'right', 'bottom', 'left'] as const;
const insetVar = (side: (typeof SIDES)[number]) => `--zoom-inset-${side}`;

/** 入頁 history state 入面嘅 zoom 來源 */
export interface ZoomState {
    zoomFrom: string;
}

export const zoomState = (key: string): ZoomState => ({ zoomFrom: key });

/** 由 location.state 攞返 zoom 來源；唔係 zoom 入嚟就 null */
export const zoomFromState = (state: unknown): string | null => {
    const from: unknown = (state as Partial<Record<keyof ZoomState, unknown>> | null)?.zoomFrom;
    return typeof from === 'string' ? from : null;
};

/** 每次標記 +1：舊過場完咗唔好清走新一次嘅標記 */
let generation = 0;

const findTile = (key: string): Element | undefined =>
    [...document.querySelectorAll(`[${KEY_ATTR}]`)].find((el) => el.getAttribute(KEY_ATTR) === key);

const insetOf = (tile: Element): ZoomInset | null =>
    zoomInset(tile.getBoundingClientRect(), {
        width: window.innerWidth,
        height: window.innerHeight,
    });

const writeInset = (inset: ZoomInset) => {
    const { style } = document.documentElement;
    SIDES.forEach((side) => style.setProperty(insetVar(side), `${inset[side]}px`));
};

const unmark = () => {
    document.querySelectorAll(`[${SOURCE_ATTR}]`).forEach((el) => el.removeAttribute(SOURCE_ATTR));
    SIDES.forEach((side) => document.documentElement.style.removeProperty(insetVar(side)));
};

/** 標記嗰格做來源（同一時間得一格，撞名成個過場會 abort），回呢次嘅號碼 */
const mark = (tile: Element, inset: ZoomInset): number => {
    unmark();
    tile.setAttribute(SOURCE_ATTR, '');
    writeInset(inset);
    generation += 1;
    return generation;
};

/** 過場完：仲係自己嗰次標記先清 */
const unmarkIf = (mine: number | null) => {
    if (mine !== null && mine === generation) unmark();
};

/**
 * 撳主頁格仔入頁：update（轉頁）放入 zoom 過場，update(true) = 真係開到過場（先好記低來源）。
 * 格仔框喺撳嗰刻量：瀏覽器喺下一格先影舊畫面、影完先行 update；撳嗰下開播令版面喺 update 之前變咗
 * （例如闊橫版播放卡出咗、格仔移位）都唔會入舊 snapshot，所以 update 入面唔再量（S-681）。
 * 格仔唔喺畫面、唔開到過場、或者上一個過場未 update，就照直接轉（update(false)），唔會食咗個 click
 */
export const zoomInto = (
    key: string,
    update: (zoomed: boolean) => void,
    kind: ZoomKind = 'zoom',
): void => {
    const tile = findTile(key);
    const inset = tile && insetOf(tile);
    if (!tile || !inset || !canViewTransition() || isViewTransitionPending()) {
        update(false);
        return;
    }
    const mine = mark(tile, inset);
    const zoomed = withViewTransition(() => update(true), kind, {
        onEnd: () => unmarkIf(mine),
    });
    if (!zoomed) update(false);
};

export interface UnzoomOptions {
    kind?: UnzoomKind;
    /**
     * 返到主頁嗰格唔喺畫面時改用嘅過場（闊橫版 back）；冇就跳過動畫。
     * 改嘅時候舊畫面（內頁）已經用 kind 嘅規則影咗：內頁成頁、頁頭、唱片格都冇名，
     * 新畫面（主頁）先跟 back（張卡、卡入面唱片格 / 名照舊有名）。所以實際變形係（S-684）：
     * - unzoom-handle → back：內頁把手（舊，player-panel）放大做主頁卡（新，player-panel）；
     *   卡入面唱片格、名得新嗰邊，淡入；其餘 root 新舊 crossfade。閂咗卡（主頁把手喺 back 冇名）就冇新嗰邊，
     *   內頁把手淡走
     * - unzoom → back：舊畫面冇任何 player-panel，淨係 root crossfade，張卡（有嘅話）淡入；
     *   唔會有 ⤢ back 嗰種成頁縮做卡
     */
    fallback?: ViewTransitionKind;
}

/**
 * 由內頁返主頁：入頁時由邊格 zoom 入嚟（key，見 zoomFromState）就縮返入嗰格（轉咗頁先搵得到）；
 * 唔係 zoom 入嚟就直接轉；返到主頁嗰格唔喺畫面就改用 fallback，冇 fallback 就跳過動畫（唔會留低半透明）
 */
export const unzoomHome = (
    key: string | null,
    update: () => void,
    { kind = 'unzoom', fallback }: UnzoomOptions = {},
): void => {
    if (key === null || isViewTransitionPending()) {
        update();
        return;
    }
    let mine: number | null = null;
    const afterUpdate = () => {
        const tile = findTile(key);
        const inset = tile && insetOf(tile);
        if (tile && inset) mine = mark(tile, inset);
        else if (fallback) retargetViewTransition(fallback);
        return mine !== null || fallback !== undefined;
    };
    const hooks = { afterUpdate, onEnd: () => unmarkIf(mine) };
    if (!withViewTransition(update, kind, hooks)) update();
};
