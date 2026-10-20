import { useLayoutEffect } from 'react';
import { viewportGap } from './viewportGap';

/** MiniPlayer.module.css 讀呢個變數，將 mini player 推落螢幕底 */
const GAP_VAR = '--viewport-gap-bottom';
const PORTRAIT_QUERY = '(orientation: portrait)';
/** viewport 高度可能變嘅時候：轉向、由 bfcache / 背景返嚟（iOS 唔一定發 resize） */
const WINDOW_EVENTS = ['resize', 'orientationchange', 'pageshow'] as const;

/**
 * 只認 iOS 主畫面 app（navigator.standalone）：display-mode: standalone 喺 Android / 桌面 PWA 都成立，
 * 嗰度 screen.height − innerHeight 係狀態列 / 工作列，唔係呢個 bug
 */
const isIosStandalone = (): boolean =>
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isPortrait = (): boolean =>
    typeof window.matchMedia === 'function' && window.matchMedia(PORTRAIT_QUERY).matches;

const measure = (): number =>
    viewportGap({
        standalone: isIosStandalone(),
        portrait: isPortrait(),
        screenHeight: window.screen.height,
        innerHeight: window.innerHeight,
    });

/**
 * 量 iOS standalone viewport 底離螢幕底幾遠，寫入 html 嘅 --viewport-gap-bottom，unmount 時清走。
 * 只畀單一個 mini player 用（主頁得一個）：多個同時 mount 嘅話，先 unmount 嗰個會清走變數
 */
export const useViewportGap = (): void => {
    useLayoutEffect(() => {
        const root = document.documentElement.style;
        const update = () => root.setProperty(GAP_VAR, `${measure()}px`);
        const onVisibility = () => {
            if (document.visibilityState !== 'hidden') update();
        };
        update();
        WINDOW_EVENTS.forEach((type) => window.addEventListener(type, update));
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            WINDOW_EVENTS.forEach((type) => window.removeEventListener(type, update));
            document.removeEventListener('visibilitychange', onVisibility);
            root.removeProperty(GAP_VAR);
        };
    }, []);
};
