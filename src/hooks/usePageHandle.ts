import { WIDE_BANNER_QUERY } from '../config/layout';
import { usePlayer } from '../player/usePlayer';
import { pageHandle, type InnerPage, type PageHandleView } from '../selectors/pageHandle';
import { hkToday } from '../utils/date';
import { useClosedHomePlayerCard } from './homePlayerCardClosed';
import { useMediaQuery } from './useMediaQuery';

/** 內頁右邊把手顯示乜（只限闊橫版；直版 / 手機打橫冇）；唔使出就 null */
export const usePageHandle = (page: InnerPage): PageHandleView | null => {
    const wide = useMediaQuery(WIDE_BANNER_QUERY);
    const { recording, isPlaying } = usePlayer();
    const closed = useClosedHomePlayerCard();
    if (!wide) return null;
    return pageHandle({ track: recording, isPlaying, closed, page, today: hkToday() });
};
