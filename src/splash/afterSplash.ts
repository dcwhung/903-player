import { SPLASH_ID } from './hideSplash';

/**
 * 等啟動畫面由 DOM 移走先做（例如直接開舊劇集頁 URL 嘅提示：啟動畫面最少 2 秒，提示 1.8 秒，
 * 唔等就會喺啟動畫面後面出完）。冇啟動畫面就即刻做。回傳 cancel（useEffect cleanup 用）
 */
export const afterSplash = (doc: Document, run: () => void): (() => void) => {
    const splash = doc.getElementById(SPLASH_ID);
    if (!splash) {
        run();
        return () => {};
    }
    const observer = new MutationObserver(() => {
        if (splash.isConnected) return;
        observer.disconnect();
        run();
    });
    observer.observe(splash.parentNode ?? doc.body, { childList: true });
    return () => observer.disconnect();
};
