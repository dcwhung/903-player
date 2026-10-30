import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WIDE_BANNER_QUERY } from '../config/layout';
import { withViewTransition } from '../utils/viewTransition';
import { useMediaQuery } from './useMediaQuery';

/**
 * 返主頁；暫停播放由 HomePage 負責，令系統返回手勢都一樣處理。
 * 闊橫版用過場（入頁倒返轉：成頁縮返做主頁右邊播放卡）；系統返回手勢 / 瀏覽器返回掣冇過場
 */
export const useGoHome = () => {
    const navigate = useNavigate();
    const wide = useMediaQuery(WIDE_BANNER_QUERY);
    return useCallback(() => {
        const go = () => void navigate('/');
        if (wide) withViewTransition(go, 'back');
        else go();
    }, [navigate, wide]);
};
