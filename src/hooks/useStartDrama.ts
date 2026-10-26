import { useCallback } from 'react';
import { dailyEpisodesOf, seriesEpisodesOf, type DramaConfig } from '../dramas';
import { usePlayer } from '../player/usePlayer';
import {
    dailyNewestFirst,
    hasNoProgress,
    pickDailyStart,
    pickSeriesStart,
} from '../selectors/dramas';
import { getProgressMap, type Progress } from '../services/progressStore';
import type { DramaEpisode } from '../types/drama';
import { isDramaEpisode } from '../types/track';
import { hkToday } from '../utils/date';

/** 入劇集播邊集：短篇劇集續播 / 下一集；每日劇集今日（或者之前最近）嗰集 */
export const dramaStartEpisode = (
    drama: DramaConfig,
    progressMap: Readonly<Record<string, Progress>>,
    today: string,
): DramaEpisode | undefined =>
    drama.kind === 'series'
        ? pickSeriesStart(seriesEpisodesOf(drama.id), progressMap)
        : pickDailyStart(dailyNewestFirst(dailyEpisodesOf(drama.id)), today);

/**
 * 第一次入短篇劇集（呢套劇任何一集都未有進度）：唔自動播，入頁先開全集表畀用戶揀短篇。
 * 每日劇集冇得揀短篇，照舊自動播
 */
export const isFirstSeriesVisit = (
    drama: DramaConfig,
    progressMap: Readonly<Record<string, Progress>>,
): boolean => drama.kind === 'series' && hasNoProgress(seriesEpisodesOf(drama.id), progressMap);

/**
 * 揀出要播嘅一集並即時開始播放。
 * 主頁喺 click handler 入面直接 call，令 iOS 容許自動播放（同 useStartPlayback 一樣）。
 * 已經載入緊呢套劇（mini player 顯示緊）就繼續播嗰集，唔好跳返續播 / 今日嗰集
 * （新揀嘅一集未存進度，按進度揀會跳返之前嗰集）
 */
export const useStartDrama = () => {
    const { load, play, recording } = usePlayer();
    return useCallback(
        (drama: DramaConfig) => {
            if (recording && isDramaEpisode(recording) && recording.dramaId === drama.id) {
                void play();
                return;
            }
            const episode = dramaStartEpisode(drama, getProgressMap(), hkToday());
            if (episode) {
                void load(episode, { autoplay: true });
            }
        },
        [load, play, recording],
    );
};
