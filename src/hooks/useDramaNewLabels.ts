import { useMemo } from 'react';
import { dramaEpisodesOf, enabledDramas, seriesEpisodesOf, type DramaConfig } from '../dramas';
import { t } from '../i18n/t';
import { usePlayer } from '../player/usePlayer';
import { hasNewUnheardArc, isArcNew } from '../selectors/arcProgress';
import { dramaHasNew } from '../selectors/dramas';
import { getProgressMap, type Progress } from '../services/progressStore';
import type { DramaId } from '../types/drama';
import { hkToday } from '../utils/date';
import { useRefreshedOn } from './useRefreshedOn';

type ProgressMap = Readonly<Record<string, Progress>>;

const watchedUrlsOf = (progressMap: ProgressMap): ReadonlySet<string> =>
    new Set(Object.keys(progressMap).filter((url) => progressMap[url]?.watched));

/** 短篇劇集有新短篇未聽過：成套劇一齊上架（全部短篇都新）→「新上架」，否則「有新短篇」 */
const seriesNewLabel = (drama: DramaConfig, progressMap: ProgressMap, today: string) => {
    const episodes = seriesEpisodesOf(drama.id);
    if (!hasNewUnheardArc(episodes, progressMap, today)) return undefined;
    const wholeDramaNew = episodes.every((e) => isArcNew(e.addedAt, today));
    return t(wholeDramaNew ? 'drama.newDrama' : 'drama.newArc');
};

/** 短篇劇集見 seriesNewLabel；每日劇集：今日一集未聽完 →「今日有新一集」 */
const newLabelOf = (drama: DramaConfig, progressMap: ProgressMap, today: string) => {
    if (drama.kind === 'series') return seriesNewLabel(drama, progressMap, today);
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
