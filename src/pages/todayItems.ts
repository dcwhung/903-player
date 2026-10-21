import type { StackCard } from '../components/ShowCardStack/ShowCardStack';
import type { ShowStatus, TodayShowItem } from '../components/TodayShowList/TodayShowList';
import { themeFor } from '../config/showThemes';
import { findShow } from '../config/shows';
import { isAvailable } from '../selectors/recordings';
import { showDateKey } from '../services/probeStore';
import type { EpisodeEntry, Recording } from '../types/recording';
import { formatBroadcastTime } from '../utils/time';

const statusOf = (isActive: boolean, isPlaying: boolean, isWatched: boolean): ShowStatus => {
    if (isActive && isPlaying) {
        return 'playing';
    }
    return isWatched ? 'watched' : 'unwatched';
};

/** 今日節目清單每一行：揀中（activeUrl）嗰個係 active；未上架嘅撳唔到、永遠唔係 active */
export const toTodayItems = (
    list: EpisodeEntry[],
    activeUrl: string | undefined,
    isPlaying: boolean,
    watchedUrls: ReadonlySet<string>,
): TodayShowItem[] =>
    list.map((r) => {
        const isActive = isAvailable(r) && r.url === activeUrl;
        return {
            key: isAvailable(r) ? r.url : showDateKey(r.showId, r.date),
            name: findShow(r.showId)?.name ?? '',
            time: formatBroadcastTime(r.time),
            art: themeFor(r.showId).art,
            active: isActive,
            status: isAvailable(r)
                ? statusOf(isActive, isPlaying, watchedUrls.has(r.url))
                : 'unavailable',
        };
    });

/** 卡疊每張卡：節目名 + 自己節目嘅色調（後面嘅卡用自己嘅色） */
export const toStackCards = (list: Recording[]): StackCard[] =>
    list.map((r) => ({
        title: findShow(r.showId)?.name ?? '',
        theme: themeFor(r.showId),
    }));
