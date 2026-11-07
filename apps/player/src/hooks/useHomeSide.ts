import { WIDE_BANNER_QUERY } from '../config/layout';
import { homeLayoutMode } from '../pages/home/homeLayoutMode';
import { homeSideOf, type HomeSide } from '../selectors/wideZoomMotion';
import { useClosedHomePlayerCard } from './homePlayerCardClosed';
import { useMediaQuery } from './useMediaQuery';
import { useHasMiniPlayer } from './useMiniPlayer';

/** 返到主頁右邊會有乜（HomePage 同一套 homeLayoutMode）：內頁揀返主頁款式用（selectors/wideZoomMotion） */
export const useHomeSide = (): HomeSide => {
    const wide = useMediaQuery(WIDE_BANNER_QUERY);
    const cardClosed = useClosedHomePlayerCard() !== null;
    const hasMiniPlayer = useHasMiniPlayer();
    return homeSideOf(homeLayoutMode({ wide, hasMiniPlayer, cardClosed }));
};
