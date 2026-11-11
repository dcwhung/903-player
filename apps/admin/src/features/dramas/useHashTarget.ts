/* 待辦跳轉 #folder / #images / #<arcId>：入頁就捲去嗰度（減少動態直接跳） */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollBehavior } from '../../utils/motion';

export const useHashTarget = (ready: boolean): string => {
    const hash = decodeURIComponent(useLocation().hash.slice(1));
    useEffect(() => {
        if (!ready || hash === '') return;
        const target = document.getElementById(hash);
        target?.scrollIntoView?.({ behavior: scrollBehavior(), block: 'center' });
    }, [ready, hash]);
    return hash;
};
