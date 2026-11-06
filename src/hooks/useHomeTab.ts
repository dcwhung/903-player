import { useCallback, useEffect, useState } from 'react';
import { HOME_TAB_STORAGE_KEY } from '../config/constants';

/** saved = 第三個 tab（P7 #7）：★ 我的收藏 / 冇收藏有收聽記錄時係最近收聽；兩樣都冇唔出 */
export type HomeTab = 'shows' | 'dramas' | 'saved';

const DEFAULT_TAB: HomeTab = 'shows';

const isHomeTab = (value: unknown): value is HomeTab =>
    value === 'shows' || value === 'dramas' || value === 'saved';

/** 私人瀏覽 / 空間不足讀唔到就用預設 tab（記住 tab 只係方便功能） */
const readTab = (): HomeTab => {
    try {
        const stored = localStorage.getItem(HOME_TAB_STORAGE_KEY);
        return isHomeTab(stored) ? stored : DEFAULT_TAB;
    } catch {
        return DEFAULT_TAB;
    }
};

const writeTab = (tab: HomeTab): void => {
    try {
        localStorage.setItem(HOME_TAB_STORAGE_KEY, tab);
    } catch {
        // 記唔低就下次返預設 tab，唔影響使用
    }
};

/**
 * 主頁「節目 / 廣播劇 / 我的收藏」tab：記住上次揀咗邊個，由劇集頁返主頁仍然喺廣播劇。
 * 第三個 tab 唔出（hasThird false：冇收藏亦冇收聽記錄）時讀到 / 揀咗 saved 就當「節目」，並記返「節目」：
 * 移除咗最後一集又冇收聽記錄就即刻跳返節目，之後再收藏都唔會突然跳去收藏 tab。
 * 仲有收聽記錄（★ 變最近收聽）就照留喺第三格
 */
export const useHomeTab = (hasThird: boolean): readonly [HomeTab, (tab: HomeTab) => void] => {
    const [stored, setStored] = useState(readTab);
    const fallback = stored === 'saved' && !hasThird;
    // render 期間改 state（React 建議嘅 derived state 寫法）：之後 hasThird 再變 true 都唔會跳返去
    if (fallback) setStored(DEFAULT_TAB);
    useEffect(() => writeTab(stored), [stored]);
    const choose = useCallback((next: HomeTab) => setStored(next), []);
    return [fallback ? DEFAULT_TAB : stored, choose] as const;
};
