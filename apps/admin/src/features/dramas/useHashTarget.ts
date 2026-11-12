/*
 * 待辦跳轉 #folder / #images / #<arcId>：入頁就捲去嗰度（減少動態直接跳）。
 * 轉 tab（path 變、hash 一樣，例如 短篇 → 排程 → 短篇 都係 #arc）都要再捲（W-717）
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollBehavior } from '../../utils/motion';

export const useHashTarget = (ready: boolean): string => {
    const { hash: raw, pathname } = useLocation();
    const hash = decodeURIComponent(raw.slice(1));
    useEffect(() => {
        if (!ready || hash === '') return;
        const target = document.getElementById(hash);
        target?.scrollIntoView?.({ behavior: scrollBehavior(), block: 'center' });
    }, [ready, hash, pathname]);
    return hash;
};
