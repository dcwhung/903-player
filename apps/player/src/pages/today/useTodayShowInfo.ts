import { useMemo } from 'react';
import { findShow } from '../../catalog/shows';
import { useItemInfoSheet } from '../../hooks/useItemInfoSheet';
import { t } from '../../i18n/t';
import { showInfoBanner, showInfoSections } from '../../selectors/itemInfo';

/**
 * HomeView 今日節目頁頁頭 ⓘ（P10 lane 7a）：而家播緊 / 睇緊嗰個節目嘅資料 sheet（同節目頁一樣），
 * 轉節目就跟住換。唔自動彈：頁頭 ⓘ 常駐可見；第一次入自動開嘅係全部今日節目資料
 * （節目表 sheet 展開，TodaySquare useTodayListSheet），唔係而家呢一個（S-1145）
 */
export const useTodayShowInfo = (showId: string | undefined) => {
    const show = showId === undefined ? undefined : findShow(showId);
    const sections = useMemo(() => (show ? showInfoSections(show) : []), [show]);
    const banner = useMemo(() => (show ? showInfoBanner(show) : undefined), [show]);
    return useItemInfoSheet(sections, false, t('info.showInfo'), banner);
};
