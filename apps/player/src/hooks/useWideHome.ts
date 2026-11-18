import { SHELF_SPLIT_QUERY, WIDE_BANNER_QUERY } from '../config/layout';
import { useMediaQuery } from './useMediaQuery';

/**
 * 主頁行唔行闊版（tab 喺頂、右邊播放卡 / 把手）：現有闊橫版（WIDE_BANNER_QUERY），
 * 或者新主頁（SHELF_SPLIT_QUERY：Duo 打開・橫、HomeView，P10）。
 * shelf：左欄用固定闊版橫額 + 疊卡 scroller（HomeWide），唔用填滿格
 */
export const useWideHome = () => {
    const banner = useMediaQuery(WIDE_BANNER_QUERY);
    const shelf = useMediaQuery(SHELF_SPLIT_QUERY);
    return { wide: banner || shelf, shelf };
};
