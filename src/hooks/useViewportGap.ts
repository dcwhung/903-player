import { useLayoutEffect } from 'react';
import { viewportGap } from './viewportGap';

/** MiniPlayer.module.css 讀呢個變數，將 mini player 推落螢幕底 */
const GAP_VAR = '--viewport-gap-bottom';
const STANDALONE_QUERY = '(display-mode: standalone)';
const PORTRAIT_QUERY = '(orientation: portrait)';

const matches = (query: string): boolean =>
    typeof window.matchMedia === 'function' && window.matchMedia(query).matches;

/** iOS 舊式 standalone 旗（Safari 加落主畫面） */
const isStandalone = (): boolean =>
    matches(STANDALONE_QUERY) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

const measure = (): number =>
    viewportGap({
        standalone: isStandalone(),
        portrait: matches(PORTRAIT_QUERY),
        screenHeight: window.screen.height,
        innerHeight: window.innerHeight,
    });

/**
 * 量 iOS standalone viewport 底離螢幕底幾遠，寫入 html 嘅 --viewport-gap-bottom（resize 時更新），
 * unmount 時清走。viewport 以下嗰截 iOS 照樣會畫（見到 canvas），mini player 用佢推落螢幕底
 */
export const useViewportGap = (): void => {
    useLayoutEffect(() => {
        const root = document.documentElement.style;
        const update = () => root.setProperty(GAP_VAR, `${measure()}px`);
        update();
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('resize', update);
            root.removeProperty(GAP_VAR);
        };
    }, []);
};
