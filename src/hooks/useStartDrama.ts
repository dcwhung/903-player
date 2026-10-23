import { useCallback } from 'react';
import type { DramaConfig } from '../config/dramas';
import { dailyEpisodesOf, seriesEpisodesOf } from '../data/dramaCatalog';
import { usePlayer } from '../player/usePlayer';
import { dailyNewestFirst, pickDailyStart, pickSeriesStart } from '../selectors/dramas';
import { getProgressMap, type Progress } from '../services/progressStore';
import type { DramaEpisode } from '../types/drama';
import { hkToday } from '../utils/date';

/** 入劇集播邊集：主題劇集續播 / 下一集；每日劇集今日（或者之前最近）嗰集 */
export const dramaStartEpisode = (
    drama: DramaConfig,
    progressMap: Readonly<Record<string, Progress>>,
    today: string,
): DramaEpisode | undefined =>
    drama.kind === 'series'
        ? pickSeriesStart(seriesEpisodesOf(drama.id), progressMap)
        : pickDailyStart(dailyNewestFirst(dailyEpisodesOf(drama.id)), today);

/**
 * 揀出要播嘅一集並即時開始播放。
 * 主頁喺 click handler 入面直接 call，令 iOS 容許自動播放（同 useStartPlayback 一樣）
 */
export const useStartDrama = () => {
    const { load } = usePlayer();
    return useCallback(
        (drama: DramaConfig) => {
            const episode = dramaStartEpisode(drama, getProgressMap(), hkToday());
            if (episode) {
                void load(episode, { autoplay: true });
            }
        },
        [load],
    );
};
