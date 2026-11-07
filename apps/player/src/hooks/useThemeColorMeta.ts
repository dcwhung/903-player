import { useLayoutEffect } from 'react';

const SELECTOR = 'meta[name="theme-color"]';

/** 攞 theme-color meta；冇就新建一個（記低係咪新建，還原時要剷返走） */
const acquireMeta = (): { meta: HTMLMetaElement; created: boolean } => {
    const existing = document.head.querySelector<HTMLMetaElement>(SELECTOR);
    if (existing) {
        return { meta: existing, created: false };
    }
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
    return { meta, created: true };
};

/**
 * 將 Android 工具列 / PWA 狀態列（<meta name="theme-color">）設成 `color`，unmount 時還原。
 * 用 layout effect：同頁面 DOM 同一個 commit 更新，唔會有一格舊色。
 * 轉頁時舊頁嘅 cleanup 喺 mutation 階段行，新頁嘅 effect 喺之後嘅 layout 階段行，所以新頁一定贏。
 * `color` 係 undefined 就乜都唔做（例如 mini player 呢類唔係成頁嘅 ThemeScope）。
 */
export const useThemeColorMeta = (color: string | undefined): void => {
    useLayoutEffect(() => {
        if (color === undefined) {
            return;
        }
        const { meta, created } = acquireMeta();
        const previous = meta.content;
        meta.content = color;
        return () => {
            if (created) {
                meta.remove();
            } else {
                meta.content = previous;
            }
        };
    }, [color]);
};
