import { useMemo } from 'react';
import { enabledDramas, type DramaConfig } from '../config/dramas';
import { dramaEpisodesOf, seriesEpisodesOf } from '../data/dramaCatalog';
import { t } from '../i18n/t';
import { usePlayer } from '../player/usePlayer';
import { hasNewUnheardArc } from '../selectors/arcProgress';
import { dramaHasNew } from '../selectors/dramas';
import { getProgressMap, type Progress } from '../services/progressStore';
import type { DramaId } from '../types/drama';
import { hkToday } from '../utils/date';
import { useRefreshedOn } from './useRefreshedOn';

type ProgressMap = Readonly<Record<string, Progress>>;

const watchedUrlsOf = (progressMap: ProgressMap): ReadonlySet<string> =>
    new Set(Object.keys(progressMap).filter((url) => progressMap[url]?.watched));

/** 短篇劇集：有新上架短篇未聽過 →「有新短篇」；每日劇集：今日一集未聽完 →「今日有新一集」 */
const newLabelOf = (drama: DramaConfig, progressMap: ProgressMap, today: string) => {
    if (drama.kind === 'series') {
        return hasNewUnheardArc(seriesEpisodesOf(drama.id), progressMap, today)
            ? t('drama.newArc')
            : undefined;
    }
    return dramaHasNew(dramaEpisodesOf(drama.id), today, watchedUrlsOf(progressMap))
        ? t('drama.newEpisode')
        : undefined;
};

/**
 * 主頁劇集格左上角「新」同佢嘅讀屏句：冇新嘢嘅劇集唔喺 Map 入面。
 * 轉集或者有集數聽完先重新讀進度；每次 render 重新攞今日，過咗香港午夜（或者 14 日）自動消失
 */
export const useDramaNewLabels = (): ReadonlyMap<DramaId, string> => {
    const { watchedRevision, recording } = usePlayer();
    const progressMap = useRefreshedOn(getProgressMap, [watchedRevision, recording]);
    const today = hkToday();
    return useMemo(
        () =>
            new Map(
                enabledDramas().flatMap((drama) => {
                    const label = newLabelOf(drama, progressMap, today);
                    return label ? [[drama.id, label] as const] : [];
                }),
            ),
        [progressMap, today],
    );
};
