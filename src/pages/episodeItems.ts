import type { EpisodeItem } from '../components/EpisodeList/EpisodeList';
import { episodeStatus } from '../components/EpisodeList/episodeStatus';
import type { Progress } from '../services/progressStore';
import type { Recording } from '../types/recording';
import { formatDayMonth, formatWeekday } from '../utils/date';

interface LiveTime {
    currentTime: number;
    duration: number;
}

/** 集數清單每一行：揀中嗰集用 player 即時時間，其他集用 localStorage 進度 */
export const toEpisodeItems = (
    episodes: Recording[],
    currentUrl: string | undefined,
    live: LiveTime,
    progressMap: Readonly<Record<string, Progress>>,
): EpisodeItem[] =>
    episodes.map((r) => {
        const isCurrent = r.url === currentUrl;
        return {
            key: r.url,
            dayMonth: formatDayMonth(r.date),
            weekday: formatWeekday(r.date),
            current: isCurrent,
            status: episodeStatus({
                isCurrent,
                live: isCurrent ? live : undefined,
                progress: progressMap[r.url],
            }),
        };
    });
