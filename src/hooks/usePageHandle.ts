import { WIDE_BANNER_QUERY } from '../config/layout';
import { usePlayer } from '../player/usePlayer';
import { pageHandle, type InnerPage, type PageHandleView } from '../selectors/pageHandle';
import { useClosedHomePlayerCard } from './homePlayerCardClosed';
import { useMediaQuery } from './useMediaQuery';

export interface PageHandleState {
    /** 把手顯示乜；唔使出就 null */
    view: PageHandleView | null;
    /**
     * 係咪闊橫版：把手因為呢頁自己嘅嘢開始播而冇咗先淡出；
     * 轉出闊橫版（轉直 / 收窄）就即刻拆走，連預留位一齊收（S-665）
     */
    wide: boolean;
}

/** 內頁右邊把手顯示乜（只限闊橫版；直版 / 手機打橫冇） */
export const usePageHandle = (page: InnerPage): PageHandleState => {
    const wide = useMediaQuery(WIDE_BANNER_QUERY);
    const { recording, isPlaying } = usePlayer();
    const closed = useClosedHomePlayerCard();
    if (!wide) return { view: null, wide };
    return { view: pageHandle({ track: recording, isPlaying, closed, page }), wide };
};
