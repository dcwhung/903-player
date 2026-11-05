import type { Progress } from '../services/progressStore';
import type { SeriesEpisode } from '../types/drama';
import { seriesContinue } from './arcProgress';
import { isArcUpcoming, isAvailable } from './availability';

type ProgressMap = Readonly<Record<string, Progress>>;

/**
 * 主頁「繼續收聽」（P8 #6）：按 catalog 已上架嘅集數（包括已下架，進度唔刪）揀續聽嗰集；
 * 嗰集下架咗就跳去之後第一集未下架嘅（由頭聽），冇就冇（收埋條）。未上架嘅集數唔會揀
 */
export const liveSeriesContinue = (
    catalog: readonly SeriesEpisode[],
    progressMap: ProgressMap,
    today: string,
): { episode: SeriesEpisode; ratio: number } | undefined => {
    const released = catalog.filter((e) => !isArcUpcoming(e.addedAt, today));
    const next = seriesContinue(released, progressMap);
    if (!next || isAvailable(next.episode, today)) return next;
    const after = released.slice(released.indexOf(next.episode) + 1);
    const episode = after.find((e) => isAvailable(e, today));
    return episode && { episode, ratio: 0 };
};
