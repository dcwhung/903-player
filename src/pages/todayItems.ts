import type { StackCard } from '../components/ShowCardStack/ShowCardStack';
import type { ShowStatus, TodayShowItem } from '../components/TodayShowList/TodayShowList';
import { findShow, themeFor } from '../shows';
import { entryKey, isAvailable } from '../selectors/recordings';
import type { EpisodeEntry, Recording } from '../types/recording';
import { formatBroadcastTime } from '../utils/time';

const statusOf = (isActive: boolean, isPlaying: boolean, isWatched: boolean): ShowStatus => {
    if (isActive && isPlaying) {
        return 'playing';
    }
    return isWatched ? 'watched' : 'unwatched';
};

/** 每行都有嘅：key、節目名、播出時間、唱片圖 */
const rowBase = (entry: EpisodeEntry) => ({
    key: entryKey(entry),
    name: findShow(entry.showId)?.name ?? '',
    time: formatBroadcastTime(entry.time),
    art: themeFor(entry.showId).art,
});

/** 今日節目清單每一行：揀中（activeUrl）嗰個係 active；未上架嘅撳唔到、永遠唔係 active */
export const toTodayItems = (
    list: EpisodeEntry[],
    activeUrl: string | undefined,
    isPlaying: boolean,
    watchedUrls: ReadonlySet<string>,
): TodayShowItem[] =>
    list.map((r) => {
        if (!isAvailable(r)) {
            return { ...rowBase(r), active: false, status: 'unavailable' };
        }
        const isActive = r.url === activeUrl;
        const status = statusOf(isActive, isPlaying, watchedUrls.has(r.url));
        return { ...rowBase(r), active: isActive, status };
    });

/** 卡疊每張卡：節目名 + 自己節目嘅色調（後面嘅卡用自己嘅色） */
export const toStackCards = (list: Recording[]): StackCard[] =>
    list.map((r) => ({
        title: findShow(r.showId)?.name ?? '',
        theme: themeFor(r.showId),
    }));
