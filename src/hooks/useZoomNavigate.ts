import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { zoomInto, zoomState, type ZoomKind } from '../utils/cardZoom';

/**
 * 撳主頁格仔入頁：轉頁放入 zoom 過場（Z3，utils/cardZoom），key 係格仔嘅 data-zoom-key。
 * 真係開到過場先將來源綁落入頁嗰個 history entry（返回時 unzoom 用，W-527）。
 * 開播唔放入過場：要喺 click 入面直接開始，iOS 先容許自動播（useStartPlayback）。
 * kind = zoom-handle：闊橫版同時主頁卡縮入內頁把手（selectors/wideZoomMotion）
 */
export const useZoomNavigate = () => {
    const navigate = useNavigate();
    return useCallback(
        (key: string, path: string, kind: ZoomKind = 'zoom') =>
            zoomInto(
                key,
                (zoomed) => {
                    void navigate(path, zoomed ? { state: zoomState(key) } : undefined);
                },
                kind,
            ),
        [navigate],
    );
};
