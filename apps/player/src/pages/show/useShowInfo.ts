import { useMemo, useState } from 'react';
import type { ShowConfig } from '@903-player/catalog';
import { useItemInfoSheet } from '../../hooks/useItemInfoSheet';
import { t } from '../../i18n/t';
import { usePlayer } from '../../player/usePlayer';
import { hasNoItemProgress, shouldAutoOpenInfo, showInfoSections } from '../../selectors/itemInfo';
import { getProgressMap } from '../../services/progressStore';
import { asShowRecording } from '../../types/track';

/**
 * 節目資料（P9.5 #12）：唱片圈 ⓘ + 獨立 sheet。第一次入（任何一集都冇進度、入頁時冇載入緊呢個節目、
 * 唔係由「我的收藏」入）而且有資料就自動彈；入頁嗰下判斷一次，之後自動播都唔再變
 */
export const useShowInfo = (show: ShowConfig | undefined, focused: boolean) => {
    const { recording } = usePlayer();
    const sections = useMemo(() => (show ? showInfoSections(show) : []), [show]);
    const [autoOpen] = useState(
        () =>
            show !== undefined &&
            shouldAutoOpenInfo({
                hasInfo: sections.length > 0,
                hasProgress: !hasNoItemProgress('show', show.id, getProgressMap()),
                loaded: asShowRecording(recording)?.showId === show.id,
                focused,
            }),
    );
    return useItemInfoSheet(sections, autoOpen, t('info.showInfo'));
};
