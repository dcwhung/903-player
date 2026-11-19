import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SQUARE_QUERY } from '../config/layout';
import { createFlagStore } from './flagStore';
import { useMediaQuery } from './useMediaQuery';
import { useOnPlayStart } from './useOnPlayStart';

const HOME_PATH = '/';

/** 去咗主頁以外（內頁）未返：module 層面，轉頁都記得；重開 app 就 reset（第一次入主頁唔算返） */
const away = createFlagStore(false);

/** App 層面（router 入面）掛一次：去咗主頁以外就記低，主頁 mount 時知道係咪由內頁返嚟 */
export const HomeAwayObserver = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        if (pathname !== HOME_PATH) away.set(true);
    }, [pathname]);
    return null;
};

/**
 * HomeView（SQUARE_QUERY）由內頁返主頁（返回掣 / 系統返回都係）：播放卡收埋、唔停播，
 * 直接見主頁選單 + 右邊把手（P10 v2.0.1 用戶反饋）；撳把手（unfold）或者喺主頁開始播先出返張卡。
 * 第一次開 app（冇去過內頁）照舊出張卡（續聽）；Duo 打開・橫同其他闊版唔收（square 先生效）。
 * 入嚟嗰下用 render 初始值決定（第一格畫面已經係收埋，返主頁過場影到嘅都係呢個版面）
 */
export const useCardFoldedOnReturn = () => {
    const square = useMediaQuery(SQUARE_QUERY);
    const [folded, setFolded] = useState(() => away.peek());
    useEffect(() => away.set(false), []);
    const unfold = useCallback(() => setFolded(false), []);
    useOnPlayStart(unfold);
    return { folded: square && folded, unfold };
};
