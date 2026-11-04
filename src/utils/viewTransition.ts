import { flushSync } from 'react-dom';
import { prefersReducedMotion } from './motion';

/**
 * 邊款過場（global.css 按 html[data-view-transition] 揀動畫）：
 * expand = 主頁播放卡入節目 / 劇集頁；back = 由嗰頁返主頁（倒返轉）；
 * close = 收埋播放卡（向右淡出、格仔伸闊）；
 * open = 張卡由冇變有（由右 slide 入 + 淡入、格仔收窄）；switch = 張卡換節目 / 劇集（成張反轉）；
 * zoom = 主頁格仔入內頁（Z3：內頁由格仔框開窗咁展開）；unzoom = 窄版由內頁返主頁（zoom 倒轉，utils/cardZoom）
 */
export type ViewTransitionKind =
    'expand' | 'back' | 'close' | 'open' | 'switch' | 'zoom' | 'unzoom';

export interface ViewTransitionHooks {
    /**
     * 過場嘅 update（flushSync）行完、瀏覽器影新畫面之前叫：回 false = 唔做動畫（skipTransition），
     * 新畫面照即刻出。只喺真係有過場先叫
     */
    afterUpdate?: () => boolean;
    /** 呢次完咗就叫一次：冇開過場（update 後）、畀上一個過場拒絕、過場完或者失敗 */
    onEnd?: () => void;
}

/** 已經開始、但 update 未行嘅過場（瀏覽器影緊舊畫面）：期間再撳（例如連撳 ⤢）唔理 */
let pending = false;
/** 過場嘅 update 行緊（flushSync 入面）：呢陣 render 嘅就係新畫面 */
let updating = false;
/** 最新嗰個過場：舊嘅完咗唔好清走新嘅標記（同 kind 連續兩次都係） */
let latest: ViewTransition | null = null;

const ignore = () => undefined;

/** 過場完（或者失敗）：仲係最新嗰個先清標記 */
const cleanupAfter = (transition: ViewTransition) => () => {
    if (latest !== transition) return;
    latest = null;
    delete document.documentElement.dataset.viewTransition;
};

/** 瀏覽器影完舊畫面先叫：同步 render 新畫面（flushSync），瀏覽器先影到 */
const runUpdate = (update: () => void, afterUpdate: () => void) => () => {
    pending = false;
    updating = true;
    try {
        flushSync(update);
    } finally {
        updating = false;
    }
    afterUpdate();
};

/**
 * 過場嘅 update 行緊（例如撳把手開返、返主頁）：呢陣 render 嘅就係新畫面，
 * 唔好再另外開過場（會打斷而家嗰個，useCardMotion）
 */
export const isViewTransitionUpdating = (): boolean => updating;

/** 已經開始、但 update 未行嘅過場（瀏覽器影緊舊畫面）：呢陣唔好郁舊畫面上面過場要用嘅標記（utils/cardZoom） */
export const isViewTransitionPending = (): boolean => pending;

/**
 * 開過場；瀏覽器同步 throw（例如 document 未 visible / 狀態唔啱）就清返標記、直接更新，
 * 之後再撳仍然得（S-641）
 */
const tryStart = (update: () => void, hooks: ViewTransitionHooks): ViewTransition | null => {
    let started: ViewTransition | null = null;
    // update 喺之後（影完舊畫面）先行，嗰陣 started 已經係呢個過場
    const after = () => {
        if (hooks.afterUpdate && !hooks.afterUpdate()) started?.skipTransition();
    };
    try {
        started = document.startViewTransition(runUpdate(update, after));
        return started;
    } catch {
        pending = false;
        delete document.documentElement.dataset.viewTransition;
        update();
        return null;
    }
};

/** 跟住過場：update 失敗要放返 pending；完咗（或者失敗）清標記再叫 onEnd */
const track = (transition: ViewTransition, onEnd: () => void) => {
    latest = transition;
    transition.ready.catch(ignore);
    transition.updateCallbackDone.catch(() => {
        pending = false;
    });
    const cleanup = cleanupAfter(transition);
    const end = () => {
        cleanup();
        onEnd();
    };
    transition.finished.then(end, end);
};

/**
 * 用 View Transitions API 做過場：瀏覽器影低前後畫面，同名（view-transition-name）嘅元素自己移位變形。
 * 唔支援、或者用戶要求減少動畫就直接更新，冇動畫。
 * update throw / 過場畀瀏覽器跳過都唔會變 unhandled rejection（S-631）。
 * 回傳 false = 上一個過場未 update，今次唔理（update 冇行、之後都唔會行）。
 * hooks 見 ViewTransitionHooks（card zoom 用嚟標記 / 清走格仔）
 */
export const withViewTransition = (
    update: () => void,
    kind: ViewTransitionKind,
    hooks: ViewTransitionHooks = {},
): boolean => {
    const { onEnd = ignore } = hooks;
    if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
        update();
        onEnd();
        return true;
    }
    if (pending) {
        onEnd();
        return false;
    }
    pending = true;
    document.documentElement.dataset.viewTransition = kind;
    const transition = tryStart(update, hooks);
    if (transition) track(transition, onEnd);
    else onEnd();
    return true;
};

export { TRANSITION_NAME, tileTransitionName } from './transitionNames';
