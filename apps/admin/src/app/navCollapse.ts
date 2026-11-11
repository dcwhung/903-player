/*
 * Nav 收細（mockup admin-style ②）：闊視窗跟用戶上次揀（localStorage 記住）；
 * 視窗窄過 NAV_AUTO_MINI_MAX 自動收細，撳「展開」只係暫時睇（唔改記住嘅選擇）
 */
import { useCallback, useEffect, useState } from 'react';

export type NavPref = 'full' | 'mini';

export const NAV_PREF_KEY = 'admin.nav';
/** 約 1100px 以下自動收細 */
export const NAV_AUTO_MINI_QUERY = '(max-width: 1099.98px)';

/** localStorage 可能被封（私密模式 / 封咗 site data）：讀唔到就當「展開」 */
export const readNavPref = (): NavPref => {
    try {
        return localStorage.getItem(NAV_PREF_KEY) === 'mini' ? 'mini' : 'full';
    } catch {
        return 'full';
    }
};

export const writeNavPref = (pref: NavPref): void => {
    try {
        localStorage.setItem(NAV_PREF_KEY, pref);
    } catch {
        // 記唔到就算：今次照樣收 / 展開
    }
};

export const isNavMini = ({
    pref,
    narrow,
    peek,
}: {
    pref: NavPref;
    narrow: boolean;
    peek: boolean;
}): boolean => (narrow ? !peek : pref === 'mini');

const narrowQuery = (): MediaQueryList | undefined =>
    typeof window.matchMedia === 'function' ? window.matchMedia(NAV_AUTO_MINI_QUERY) : undefined;

/** 視窗窄唔窄；一變就收返暫時展開（peek） */
const useNarrow = () => {
    const [narrow, setNarrow] = useState(() => narrowQuery()?.matches ?? false);
    const [peek, setPeek] = useState(false);
    useEffect(() => {
        const query = narrowQuery();
        if (!query) return undefined;
        const onChange = () => {
            setNarrow(query.matches);
            setPeek(false);
        };
        query.addEventListener('change', onChange);
        return () => query.removeEventListener('change', onChange);
    }, []);
    return { narrow, peek, setPeek };
};

export const useNavCollapse = () => {
    const { narrow, peek, setPeek } = useNarrow();
    const [pref, setPref] = useState<NavPref>(readNavPref);
    const mini = isNavMini({ pref, narrow, peek });
    const toggle = useCallback(() => {
        if (narrow) return setPeek((value) => !value);
        const next: NavPref = pref === 'mini' ? 'full' : 'mini';
        writeNavPref(next);
        setPref(next);
    }, [narrow, pref, setPeek]);
    return { mini, toggle };
};
