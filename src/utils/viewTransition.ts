import { flushSync } from 'react-dom';
import { prefersReducedMotion } from './motion';

/**
 * 邊款過場（global.css 按 html[data-view-transition] 揀動畫）：
 * expand = 主頁播放卡入節目 / 劇集頁；back = 由嗰頁返主頁（倒返轉）；
 * close = 收埋播放卡（向右淡出、格仔伸闊）；open = 再出返（由右淡入）
 */
export type ViewTransitionKind = 'expand' | 'back' | 'close' | 'open';

/** 已經開始、但 update 未行嘅過場（瀏覽器影緊舊畫面）：期間再撳（例如連撳 ⤢）唔理 */
let pending = false;
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
const runUpdate = (update: () => void) => () => {
    pending = false;
    flushSync(update);
};

/**
 * 開過場；瀏覽器同步 throw（例如 document 未 visible / 狀態唔啱）就清返標記、直接更新，
 * 之後再撳仍然得（S-641）
 */
const tryStart = (update: () => void): ViewTransition | null => {
    try {
        return document.startViewTransition(runUpdate(update));
    } catch {
        pending = false;
        delete document.documentElement.dataset.viewTransition;
        update();
        return null;
    }
};

/**
 * 用 View Transitions API 做過場：瀏覽器影低前後畫面，同名（view-transition-name）嘅元素自己移位變形。
 * 唔支援、或者用戶要求減少動畫就直接更新，冇動畫。
 * update throw / 過場畀瀏覽器跳過都唔會變 unhandled rejection（S-631）
 */
export const withViewTransition = (update: () => void, kind: ViewTransitionKind): void => {
    if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
        update();
        return;
    }
    if (pending) return;
    pending = true;
    document.documentElement.dataset.viewTransition = kind;
    const transition = tryStart(update);
    if (!transition) return;
    latest = transition;
    transition.ready.catch(ignore);
    transition.updateCallbackDone.catch(() => {
        pending = false;
    });
    const cleanup = cleanupAfter(transition);
    transition.finished.then(cleanup, cleanup);
};

export { TRANSITION_NAME, tileTransitionName } from './transitionNames';
