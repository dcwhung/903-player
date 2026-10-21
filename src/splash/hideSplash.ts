/** index.html 入面 inline 嘅啟動畫面 */
export const SPLASH_ID = 'splash';
export const SPLASH_HIDDEN_CLASS = 'splash--hidden';
/** 由開頁計起最少顯示幾耐：app 載得快都要睇清楚個啟動畫面先淡出 */
export const SPLASH_MIN_VISIBLE_MS = 2_000;
/** 淡出約 0.5s（index.html --splash-fade-duration）；減少動態時冇 transitionend，靠呢個時限移走 */
export const SPLASH_REMOVE_FALLBACK_MS = 900;

/** 淡出，完咗就由 DOM 移走（唔好留住個 fixed 層同動畫） */
const fadeOut = (splash: HTMLElement): void => {
    const remove = (): void => {
        clearTimeout(fallback);
        splash.remove();
    };
    const fallback = setTimeout(remove, SPLASH_REMOVE_FALLBACK_MS);
    splash.addEventListener('transitionend', remove, { once: true });
    splash.classList.add(SPLASH_HIDDEN_CLASS);
};

/**
 * app 第一次 render 完叫：開頁夠 SPLASH_MIN_VISIBLE_MS 先淡出啟動畫面。
 * elapsedMs 預設 performance.now()，即係由開頁（navigation start）計起。
 * 回傳 cancel，畀 useEffect cleanup 用（StrictMode 重複行 effect 都只會淡出一次）；
 * 搵唔到（例如測試環境）就乜都唔做
 */
export const hideSplash = (doc: Document, elapsedMs: number = performance.now()): (() => void) => {
    const splash = doc.getElementById(SPLASH_ID);
    if (!splash) return () => {};
    const timer = setTimeout(() => fadeOut(splash), Math.max(0, SPLASH_MIN_VISIBLE_MS - elapsedMs));
    return () => clearTimeout(timer);
};
