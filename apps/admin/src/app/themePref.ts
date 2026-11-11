/*
 * 淺 / 深色（3c 用後回饋）：跟系統（預設）/ 淺色 / 深色。揀咗存 localStorage（同一個 key 畀 index.html、
 * login、Worker 403 頁嘅 inline script 喺 first paint 前套用），<html data-theme="light|dark">；
 * 跟系統 = 冇 data-theme，tokens.css 用 prefers-color-scheme
 */
import { useCallback, useState } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';

/** 改呢個要同步改 index.html 同 apps/api/src/auth/deniedPage.ts 嘅 inline script */
export const THEME_KEY = 'admin.theme';

const CYCLE: readonly ThemePref[] = ['system', 'light', 'dark'];

export const readThemePref = (): ThemePref => {
    try {
        const value = localStorage.getItem(THEME_KEY);
        return value === 'light' || value === 'dark' ? value : 'system';
    } catch {
        return 'system';
    }
};

export const writeThemePref = (pref: ThemePref): void => {
    try {
        if (pref === 'system') localStorage.removeItem(THEME_KEY);
        else localStorage.setItem(THEME_KEY, pref);
    } catch {
        // 記唔到就算：今次照樣套用
    }
};

export const applyTheme = (pref: ThemePref): void => {
    const root = document.documentElement;
    if (pref === 'system') delete root.dataset.theme;
    else root.dataset.theme = pref;
};

export const nextTheme = (pref: ThemePref): ThemePref =>
    CYCLE[(CYCLE.indexOf(pref) + 1) % CYCLE.length] ?? 'system';

export const useThemePref = () => {
    const [pref, setPref] = useState<ThemePref>(readThemePref);
    const choose = useCallback((next: ThemePref) => {
        writeThemePref(next);
        applyTheme(next);
        setPref(next);
    }, []);
    return { pref, choose };
};
