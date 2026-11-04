import { isViewTransitionPending, withViewTransition } from './viewTransition';
import { zoomInset, type ZoomInset } from './zoomInset';

/**
 * 主頁格仔 zoom 入內頁（Z3，_mockups_/card-zoom）：
 * 撳格仔嗰刻量格仔框寫入 html 嘅 --zoom-inset-*，格仔標 data-zoom-source（global.css 先畀佢 zoom-tile 名），
 * 內頁由嗰個框開窗咁展開；窄版返主頁（unzoom）縮返入同一格。過場完就清走標記同框
 */

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

/** 上次由邊格 zoom 入咗邊頁：返回時仲喺嗰頁先 unzoom */
let source: { key: string; path: string } | null = null;
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
 * 撳主頁格仔入頁：update（轉頁）放入 zoom 過場。
 * 格仔唔喺畫面、或者上一個過場未 update，就照直接轉，唔會食咗個 click
 */
export const zoomInto = (key: string, path: string, update: () => void): void => {
    source = { key, path };
    const tile = findTile(key);
    const inset = tile && insetOf(tile);
    if (!tile || !inset || isViewTransitionPending()) {
        update();
        return;
    }
    const mine = mark(tile, inset);
    // 影完舊畫面先轉頁：嗰陣再量一次（例如同一下撳開播令闊橫版播放卡出咗，格仔移咗位）
    const measured = () => {
        writeInset(insetOf(tile) ?? inset);
        update();
    };
    if (!withViewTransition(measured, 'zoom', { onEnd: () => unmarkIf(mine) })) update();
};

/**
 * 窄版由內頁返主頁：之前由邊格 zoom 入嚟就縮返入嗰格（轉咗頁先搵得到）；
 * 冇記錄、唔係嗰頁就直接轉；返到主頁嗰格唔喺畫面就跳過動畫（唔會留低半透明）
 */
export const unzoomHome = (pathname: string, update: () => void): void => {
    const key = source?.path === pathname ? source.key : null;
    source = null;
    if (key === null || isViewTransitionPending()) {
        update();
        return;
    }
    let mine: number | null = null;
    const afterUpdate = () => {
        const tile = findTile(key);
        const inset = tile && insetOf(tile);
        if (tile && inset) mine = mark(tile, inset);
        return mine !== null;
    };
    const hooks = { afterUpdate, onEnd: () => unmarkIf(mine) };
    if (!withViewTransition(update, 'unzoom', hooks)) update();
};
