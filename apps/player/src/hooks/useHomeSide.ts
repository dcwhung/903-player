import { homeLayoutMode } from '../pages/home/homeLayoutMode';
import type { HomeSide } from '../selectors/wideZoomMotion';
import { useClosedHomePlayerCard } from './homePlayerCardClosed';
import { useHasMiniPlayer } from './useMiniPlayer';
import { transitionSide, useWideHome } from './useWideHome';

/** 返到主頁右邊會有乜（HomePage 同一套 homeLayoutMode）：內頁揀返主頁款式用（selectors/wideZoomMotion） */
export const useHomeSide = (): HomeSide => {
    const { wide, pageHandles } = useWideHome();
    const cardClosed = useClosedHomePlayerCard() !== null;
    const hasMiniPlayer = useHasMiniPlayer();
    return transitionSide(homeLayoutMode({ wide, hasMiniPlayer, cardClosed }), pageHandles);
};
