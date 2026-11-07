import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { InnerPage } from '../selectors/pageHandle';
import { wideBackMotion } from '../selectors/wideZoomMotion';
import { unzoomHome, zoomFromState } from '../utils/cardZoom';
import { withViewTransition } from '../utils/viewTransition';
import { useHomeSide } from './useHomeSide';
import { usePageHandle } from './usePageHandle';

/**
 * 返主頁（page = 呢頁，睇右邊有冇把手）；暫停播放由 HomePage 負責，令系統返回手勢都一樣處理。
 * 窄版由格仔 zoom 入嚟就縮返入嗰格（unzoom，Z3），否則直接轉。
 * 闊橫版按 wideBackMotion（_mockups_/card-zoom-wide）：唔係 zoom 入嚟、或者返到會有卡而冇把手就 back
 * （成頁縮做右邊卡）；有把手就倒 zoom + 把手放大做卡；閂咗卡就淨係倒 zoom。返到嗰格唔喺畫面就改做 back。
 * 系統返回手勢 / 瀏覽器返回掣冇過場
 */
export const useGoHome = (page: InnerPage) => {
    const navigate = useNavigate();
    // 入頁嗰個 history entry 有記低 zoom 來源先 unzoom（系統返回、mini player 入頁都冇，W-527）
    const zoomFrom = zoomFromState(useLocation().state);
    const { view, wide } = usePageHandle(page);
    const side = useHomeSide();
    // usePageHandle 喺窄版 view 係 null；view 有 = 把手顯示緊而且唔係淡出緊（淡出緊嗰陣 view 已經係 null）
    const handle = view !== null;
    return useCallback(() => {
        const go = () => void navigate('/');
        if (!wide) {
            unzoomHome(zoomFrom, go);
            return;
        }
        const motion = wideBackMotion({ zoomed: zoomFrom !== null, handle, side });
        if (motion === 'back') withViewTransition(go, 'back');
        else unzoomHome(zoomFrom, go, { kind: motion, fallback: 'back' });
    }, [navigate, zoomFrom, wide, handle, side]);
};
