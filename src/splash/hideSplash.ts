/** index.html 入面 inline 嘅啟動畫面 */
export const SPLASH_ID = 'splash';
export const SPLASH_HIDDEN_CLASS = 'splash--hidden';
/** 淡出約 0.3s；減少動態時冇 transition，冇 transitionend，靠呢個時限移走 */
export const SPLASH_REMOVE_FALLBACK_MS = 600;

/**
 * app 第一次 render 完：淡出啟動畫面，完咗就由 DOM 移走（唔好留住個 fixed 層同動畫）。
 * 搵唔到（例如測試環境）就乜都唔做
 */
export const hideSplash = (doc: Document): void => {
    const splash = doc.getElementById(SPLASH_ID);
    if (!splash) return;
    const remove = (): void => {
        clearTimeout(fallback);
        splash.remove();
    };
    const fallback = setTimeout(remove, SPLASH_REMOVE_FALLBACK_MS);
    splash.addEventListener('transitionend', remove, { once: true });
    splash.classList.add(SPLASH_HIDDEN_CLASS);
};
