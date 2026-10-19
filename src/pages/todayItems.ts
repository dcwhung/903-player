import type { ShowStatus, TodayShowItem } from '../components/TodayShowList/TodayShowList';
import { themeFor } from '../config/showThemes';
import { findShow } from '../config/shows';
import type { Recording } from '../types/recording';
import { formatBroadcastTime } from '../utils/time';

const statusOf = (isActive: boolean, isPlaying: boolean, isWatched: boolean): ShowStatus => {
    if (isActive && isPlaying) {
        return 'playing';
    }
    return isWatched ? 'watched' : 'unwatched';
};

/** 今日節目清單每一行 */
export const toTodayItems = (
    list: Recording[],
    activeIndex: number,
    isPlaying: boolean,
    watchedUrls: ReadonlySet<string>,
): TodayShowItem[] =>
    list.map((r, i) => ({
        key: r.url,
        name: findShow(r.showId)?.name ?? '',
        time: formatBroadcastTime(r.time),
        art: themeFor(r.showId).art,
        active: i === activeIndex,
        status: statusOf(i === activeIndex, isPlaying, watchedUrls.has(r.url)),
    }));
