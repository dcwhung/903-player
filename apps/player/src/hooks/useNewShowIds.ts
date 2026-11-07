import { useMemo } from 'react';
import { hkToday } from '@903-player/catalog';
import { useRecordings } from '../data/useRecordings';
import { usePlayer } from '../player/usePlayer';
import { newShowIds } from '../selectors/recordings';
import { getWatchedIds } from '../services/progressStore';
import type { ShowId } from '../types/recording';
import { useRefreshedOn } from './useRefreshedOn';

/** 主頁節目格嘅「New」：今日已上架而且未聽完；有集數變成聽過就重新計 */
export const useNewShowIds = (): ReadonlySet<ShowId> => {
    const { recordings } = useRecordings();
    const { watchedRevision } = usePlayer();
    const watchedIds = useRefreshedOn(getWatchedIds, [watchedRevision]);
    // 每次 render 重新攞今日，app 開過香港午夜就自動清走
    const today = hkToday();
    return useMemo(
        () => newShowIds(recordings, today, watchedIds),
        [recordings, today, watchedIds],
    );
};
