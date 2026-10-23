import { useCallback, useState } from 'react';
import { HOME_TAB_STORAGE_KEY } from '../config/constants';

export type HomeTab = 'shows' | 'dramas';

const DEFAULT_TAB: HomeTab = 'shows';

const isHomeTab = (value: unknown): value is HomeTab => value === 'shows' || value === 'dramas';

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

/** 主頁「節目 / 廣播劇」tab：記住上次揀咗邊個，由劇集頁返主頁仍然喺廣播劇 */
export const useHomeTab = (): readonly [HomeTab, (tab: HomeTab) => void] => {
    const [tab, setTab] = useState(readTab);
    const choose = useCallback((next: HomeTab) => {
        setTab(next);
        writeTab(next);
    }, []);
    return [tab, choose] as const;
};
