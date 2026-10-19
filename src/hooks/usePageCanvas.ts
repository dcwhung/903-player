import { useLayoutEffect } from 'react';

/** global.css 嘅 html background 讀呢個變數 */
const CANVAS_VAR = '--page-canvas';

/**
 * 將 html 背景（canvas）設成 `color`，unmount 時還原。
 * iOS standalone（black-translucent + viewport-fit=cover）嘅 viewport 有時矮過成個螢幕，
 * 或者橡筋拉開時，home indicator 後面露出嘅係 canvas；預設係深色 --color-bg，
 * 主頁漸變 / 節目色調底下面就會見到一條深色帶，所以 canvas 要跟住頁面底色。
 * 用 layout effect，同 useThemeColorMeta 一樣同頁面 DOM 同一個 commit 更新。
 * `color` 係 undefined 就乜都唔做（例如 mini player 呢類唔係成頁嘅 ThemeScope）。
 */
export const usePageCanvas = (color: string | undefined): void => {
    useLayoutEffect(() => {
        if (color === undefined) {
            return;
        }
        const root = document.documentElement.style;
        const previous = root.getPropertyValue(CANVAS_VAR);
        root.setProperty(CANVAS_VAR, color);
        return () => {
            if (previous) {
                root.setProperty(CANVAS_VAR, previous);
            } else {
                root.removeProperty(CANVAS_VAR);
            }
        };
    }, [color]);
};
