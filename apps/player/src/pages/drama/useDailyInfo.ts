import { useMemo, useState } from 'react';
import type { DramaConfig } from '@903-player/catalog';
import { useItemInfoSheet } from '../../hooks/useItemInfoSheet';
import { t } from '../../i18n/t';
import { usePlayer } from '../../player/usePlayer';
import { isEpisodeOfDrama } from '../../selectors/dramas';
import {
    dailyInfoBanner,
    dailyInfoSections,
    hasNoItemProgress,
    shouldAutoOpenInfo,
} from '../../selectors/itemInfo';
import { getProgressMap } from '../../services/progressStore';

/**
 * 每日劇資料（P9.5 #12）：唱片圈 ⓘ + 獨立 sheet；第一次入（冇進度、冇載入、唔係由收藏入）
 * 而且有簡介就自動彈，同節目頁一樣入頁嗰下判斷一次
 */
export const useDailyInfo = (drama: DramaConfig, focused: boolean) => {
    const { recording } = usePlayer();
    const sections = useMemo(() => dailyInfoSections(drama), [drama]);
    const [autoOpen] = useState(() =>
        shouldAutoOpenInfo({
            hasInfo: sections.length > 0,
            hasProgress: !hasNoItemProgress('drama', drama.id, getProgressMap()),
            loaded: isEpisodeOfDrama(recording, drama.id),
            focused,
        }),
    );
    const banner = useMemo(() => dailyInfoBanner(drama), [drama]);
    return useItemInfoSheet(sections, autoOpen, t('info.dramaInfo'), banner);
};
