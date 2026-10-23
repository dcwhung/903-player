import { useMemo } from 'react';
import { DRAMAS } from '../config/dramas';
import { dramaEpisodesOf } from '../data/dramaCatalog';
import { usePlayer } from '../player/usePlayer';
import { dramaHasNew } from '../selectors/dramas';
import { getWatchedUrls } from '../services/progressStore';
import type { DramaId } from '../types/drama';
import { hkToday } from '../utils/date';
import { useRefreshedOn } from './useRefreshedOn';

/** 主頁劇集格嘅「New」：每日劇集今日有一集而且未聽完；有集數變成聽過就重新計 */
export const useNewDramaIds = (): ReadonlySet<DramaId> => {
    const { watchedRevision } = usePlayer();
    const watchedUrls = useRefreshedOn(getWatchedUrls, [watchedRevision]);
    // 每次 render 重新攞今日，app 開過香港午夜就自動清走
    const today = hkToday();
    return useMemo(
        () =>
            new Set(
                DRAMAS.filter((d) => dramaHasNew(dramaEpisodesOf(d.id), today, watchedUrls)).map(
                    (d) => d.id,
                ),
            ),
        [today, watchedUrls],
    );
};
