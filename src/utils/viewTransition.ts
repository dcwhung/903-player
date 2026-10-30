import { flushSync } from 'react-dom';
import { prefersReducedMotion } from './motion';

/**
 * 邊款過場（global.css 按 html[data-view-transition] 揀動畫）：
 * expand = 主頁播放卡入節目 / 劇集頁；back = 由嗰頁返主頁（倒返轉）；
 * close = 收埋播放卡（向右淡出、格仔伸闊）；open = 再出返（由右淡入）
 */
export type ViewTransitionKind = 'expand' | 'back' | 'close' | 'open';

/**
 * 用 View Transitions API 做過場：瀏覽器影低前後畫面，同名（view-transition-name）嘅元素自己移位變形。
 * 唔支援、或者用戶要求減少動畫就直接更新，冇動畫。
 * update 要喺 callback 入面同步 render 完（flushSync），瀏覽器先影到新畫面
 */
export const withViewTransition = (update: () => void, kind: ViewTransitionKind): void => {
    if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
        update();
        return;
    }
    const root = document.documentElement;
    root.dataset.viewTransition = kind;
    const transition = document.startViewTransition(() => flushSync(update));
    // 過場畀瀏覽器跳過（例如連撳）ready 會 reject，唔當錯
    transition.ready.catch(() => undefined);
    // 畀新嘅過場蓋過就唔好清走人哋嘅標記
    void transition.finished.finally(() => {
        if (root.dataset.viewTransition === kind) delete root.dataset.viewTransition;
    });
};
