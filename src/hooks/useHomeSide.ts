import { WIDE_BANNER_QUERY } from '../config/layout';
import { useRecordings } from '../data/useRecordings';
import { homeLayoutMode } from '../pages/home/homeLayoutMode';
import { usePlayer } from '../player/usePlayer';
import { showsOnDate } from '../selectors/recordings';
import { homeSideOf, type HomeSide } from '../selectors/wideZoomMotion';
import { hkToday } from '../utils/date';
import { useClosedHomePlayerCard } from './homePlayerCardClosed';
import { useMediaQuery } from './useMediaQuery';
import { useMiniPlayerDismissed } from './miniPlayerDismissed';

/**
 * 主頁有冇 mini player（闊橫版即係右邊播放卡）：同 useMiniPlayer 一樣，載入咗嘢、或者今日有節目就有，
 * 左滑關咗就冇。內頁用：唔使成個 useMiniPlayer（佢有自己揀緊邊個嘅 state）
 */
const useHasMiniPlayer = (): boolean => {
    const { recording } = usePlayer();
    const { recordings } = useRecordings();
    const dismissed = useMiniPlayerDismissed();
    return !dismissed && (recording !== null || showsOnDate(recordings, hkToday()).length > 0);
};

/** 返到主頁右邊會有乜（HomePage 同一套 homeLayoutMode）：內頁揀返主頁款式用（selectors/wideZoomMotion） */
export const useHomeSide = (): HomeSide => {
    const wide = useMediaQuery(WIDE_BANNER_QUERY);
    const cardClosed = useClosedHomePlayerCard() !== null;
    const hasMiniPlayer = useHasMiniPlayer();
    return homeSideOf(homeLayoutMode({ wide, hasMiniPlayer, cardClosed }));
};
