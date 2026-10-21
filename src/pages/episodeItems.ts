import type { EpisodeItem } from '../components/EpisodeList/EpisodeList';
import { episodeStatus, unavailableStatus } from '../components/EpisodeList/episodeStatus';
import { entryKey, isAvailable } from '../selectors/recordings';
import type { Progress } from '../services/progressStore';
import type { EpisodeEntry, UnavailableEpisode } from '../types/recording';
import { formatDayMonth, formatWeekday } from '../utils/date';

interface LiveTime {
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

/** 集數清單每一行：揀中嗰集用 player 即時時間，其他集用 localStorage 進度；未上架嘅撳唔到 */
export const toEpisodeItems = (
    episodes: EpisodeEntry[],
    currentUrl: string | undefined,
    live: LiveTime,
    progressMap: Readonly<Record<string, Progress>>,
    isPlaying: boolean,
): EpisodeItem[] =>
    episodes.map((r) => {
        if (!isAvailable(r)) return toUnavailableItem(r);
        const isCurrent = r.url === currentUrl;
        return {
            key: entryKey(r),
            dayMonth: formatDayMonth(r.date),
            weekday: formatWeekday(r.date),
            current: isCurrent,
            isPlaying: isCurrent && isPlaying,
            status: episodeStatus({
                isCurrent,
                live: isCurrent ? live : undefined,
                progress: progressMap[r.url],
            }),
        };
    });
