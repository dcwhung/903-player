import type { EpisodeItem } from '../components/EpisodeList/EpisodeList';
import { episodeStatus, unavailableStatus } from '../components/EpisodeList/episodeStatus';
import { entryKey, isAvailable } from '../selectors/recordings';
import type { Progress } from '../services/progressStore';
import type { EpisodeEntry, UnavailableEpisode } from '../types/recording';
import { formatDayMonth, formatWeekday } from '../utils/date';

export interface LiveTime {
    currentTime: number;
    duration: number;
}

/** 未上架嗰行：撳唔到，冇進度 */
const toUnavailableItem = (episode: UnavailableEpisode): EpisodeItem => ({
    key: entryKey(episode),
    dayMonth: formatDayMonth(episode.date),
    weekday: formatWeekday(episode.date),
    current: false,
    isPlaying: false,
    status: unavailableStatus(),
});

/** 播得嘅一行嘅文字：大字、細字、標籤 */
export type RowLabels = Pick<EpisodeItem, 'dayMonth' | 'weekday' | 'tag'>;

/** 計每一行狀態要嘅 player / 進度資料（節目頁、廣播劇頁共用） */
export interface RowContext {
    currentUrl: string | undefined;
    live: LiveTime;
    progressMap: Readonly<Record<string, Progress>>;
    /** 揀中嗰集播緊 */
    isPlaying: boolean;
}

/** 播得嘅一行（key = 網址）：揀中嗰集用 player 即時時間，其他集用 localStorage 進度 */
export const toPlayableItem = (url: string, labels: RowLabels, ctx: RowContext): EpisodeItem => {
    const isCurrent = url === ctx.currentUrl;
    return {
        key: url,
        ...labels,
        current: isCurrent,
        isPlaying: isCurrent && ctx.isPlaying,
        status: episodeStatus({
            isCurrent,
            live: isCurrent ? ctx.live : undefined,
            progress: ctx.progressMap[url],
        }),
    };
};

/** 集數清單每一行：揀中嗰集用 player 即時時間，其他集用 localStorage 進度；未上架嘅撳唔到 */
export const toEpisodeItems = (
    episodes: EpisodeEntry[],
    currentUrl: string | undefined,
    live: LiveTime,
    progressMap: Readonly<Record<string, Progress>>,
    isPlaying: boolean,
): EpisodeItem[] =>
    episodes.map((r) =>
        isAvailable(r)
            ? toPlayableItem(
                  entryKey(r),
                  { dayMonth: formatDayMonth(r.date), weekday: formatWeekday(r.date) },
                  { currentUrl, live, progressMap, isPlaying },
              )
            : toUnavailableItem(r),
    );
