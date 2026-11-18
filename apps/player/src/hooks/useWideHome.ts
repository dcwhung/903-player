import { SHELF_SPLIT_QUERY, WIDE_BANNER_QUERY } from '../config/layout';
import type { HomeLayoutMode } from '../pages/home/homeLayoutMode';
import { homeSideOf, type HomeSide } from '../selectors/wideZoomMotion';
import { useMediaQuery } from './useMediaQuery';

/**
 * 主頁行唔行闊版（tab 喺頂、右邊播放卡 / 把手）：現有闊橫版（WIDE_BANNER_QUERY），
 * 或者新主頁（SHELF_SPLIT_QUERY：Duo 打開・橫、HomeView，P10）。
 * shelf：有播放卡時左欄用固定闊版橫額 + 疊卡 scroller（HomeWide）。
 * pageHandles：內頁會唔會有右邊把手（usePageHandle，只係闊橫版；HomeView 唔係橫向，內頁係窄版）
 */
export const useWideHome = () => {
    const banner = useMediaQuery(WIDE_BANNER_QUERY);
    const shelf = useMediaQuery(SHELF_SPLIT_QUERY);
    return { wide: banner || shelf, shelf, pageHandles: banner };
};

/**
 * 主頁右邊有乜（格仔入頁 / 返主頁揀過場，selectors/wideZoomMotion）：內頁冇把手（HomeView）就當冇，
 * 同窄版一樣淨係 zoom / unzoom，唔會變形去一個唔存在嘅內頁把手（W-787）
 */
export const transitionSide = (mode: HomeLayoutMode, pageHandles: boolean): HomeSide =>
    pageHandles ? homeSideOf(mode) : 'none';
