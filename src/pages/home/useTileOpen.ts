import { useNavigate } from 'react-router-dom';
import { useClosedHomePlayerCard } from '../../hooks/homePlayerCardClosed';
import { useZoomNavigate } from '../../hooks/useZoomNavigate';
import { usePlayer } from '../../player/usePlayer';
import { pageHandle, type InnerPage } from '../../selectors/pageHandle';
import { wideTileMotion, type HomeSide } from '../../selectors/wideZoomMotion';
import type { PlayerItem } from '../../types/playerItem';
import { withViewTransition } from '../../utils/viewTransition';

/** 主頁右邊而家有乜（HomePage 由版面同 mini player 推出嚟） */
export interface HomeRight {
    side: HomeSide;
    /** 右邊卡顯示緊嘅節目 / 劇集；冇卡 = null */
    card: PlayerItem | null;
}

export interface TileTarget {
    /** 格仔嘅 data-zoom-key */
    key: string;
    path: string;
    page: InnerPage;
    /** 呢下撳格真係開咗播（start* 嘅結果，S-682；開播就係呢頁自己嘅嘢，內頁冇把手） */
    starts: boolean;
    /** 入頁要帶嘅 history state（例如收藏 tab 撳行：focusUrl，唔播、捲去嗰集） */
    state?: object;
}

/**
 * 撳主頁格仔入頁，按 wideTileMotion（_mockups_/card-zoom-wide）揀過場：
 * 張卡就係呢頁就同 ⤢ 一樣 expand；內頁會有把手就 zoom 同時張卡縮入把手；否則淨係 zoom（窄版永遠係呢款）。
 * 開播（如有）由 caller 喺同一個 click 入面先做（iOS 自動播）；呢度用 click 嗰刻嘅 state，唔睇 DOM
 */
export const useTileOpen = ({ side, card }: HomeRight) => {
    const zoom = useZoomNavigate();
    const navigate = useNavigate();
    const { recording, isPlaying } = usePlayer();
    const closed = useClosedHomePlayerCard();
    return ({ key, path, page, starts, state }: TileTarget) => {
        const handle =
            !starts && pageHandle({ track: recording, isPlaying, closed, page }) !== null;
        const motion = wideTileMotion({ side, card, page, handle });
        const go = () => void navigate(path, state ? { state } : undefined);
        if (motion === 'expand') withViewTransition(go, 'expand');
        else zoom(key, path, motion, state);
    };
};
