import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WIDE_BANNER_QUERY } from '../config/layout';
import { unzoomHome, zoomFromState } from '../utils/cardZoom';
import { withViewTransition } from '../utils/viewTransition';
import { useMediaQuery } from './useMediaQuery';

/**
 * 返主頁；暫停播放由 HomePage 負責，令系統返回手勢都一樣處理。
 * 闊橫版用過場（入頁倒返轉：成頁縮返做主頁右邊播放卡）；
 * 窄版由格仔 zoom 入嚟就縮返入嗰格（unzoom，Z3），否則直接轉；系統返回手勢 / 瀏覽器返回掣冇過場
 */
export const useGoHome = () => {
    const navigate = useNavigate();
    // 入頁嗰個 history entry 有記低 zoom 來源先 unzoom（系統返回、mini player 入頁都冇，W-527）
    const zoomFrom = zoomFromState(useLocation().state);
    const wide = useMediaQuery(WIDE_BANNER_QUERY);
    return useCallback(() => {
        const go = () => void navigate('/');
        if (wide) withViewTransition(go, 'back');
        else unzoomHome(zoomFrom, go);
    }, [navigate, zoomFrom, wide]);
};
