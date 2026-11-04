import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { zoomInto } from '../utils/cardZoom';

/**
 * 撳主頁格仔入頁：轉頁放入 zoom 過場（Z3，utils/cardZoom），key 係格仔嘅 data-zoom-key。
 * 開播唔放入過場：要喺 click 入面直接開始，iOS 先容許自動播（useStartPlayback）
 */
export const useZoomNavigate = () => {
    const navigate = useNavigate();
    return useCallback(
        (key: string, path: string) => zoomInto(key, path, () => void navigate(path)),
        [navigate],
    );
};
