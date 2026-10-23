import { t } from '../i18n/t';
import type { Progress } from '../services/progressStore';
import type { DailyEpisode, DramaEpisode, SeriesEpisode } from '../types/drama';
import { formatDateLabel } from '../utils/date';

const isDaily = (episode: DramaEpisode): episode is DailyEpisode => episode.kind === 'daily';

/** 短篇（按 catalogue 次序，每個一次） */
export const seriesArcs = (episodes: readonly SeriesEpisode[]): string[] => [
    ...new Set(episodes.map((e) => e.arc)),
];

/** 某短篇嘅集數，按集數排 */
export const episodesInArc = (episodes: readonly SeriesEpisode[], arc: string): SeriesEpisode[] =>
    episodes.filter((e) => e.arc === arc).sort((a, b) => a.no - b.no);

/** 呢套劇最近郁過（有進度）嘅一集 */
const lastTouched = (
    episodes: readonly SeriesEpisode[],
    progressMap: Readonly<Record<string, Progress>>,
): number => {
    let latest = -1;
    let latestAt = -Infinity;
    episodes.forEach((e, i) => {
        const updatedAt = progressMap[e.url]?.updatedAt;
        if (updatedAt !== undefined && updatedAt > latestAt) [latest, latestAt] = [i, updatedAt];
    });
    return latest;
};

/**
 * 短篇劇集入頁播邊集（episodes 係由第一個短篇第 1 集排到最後）：
 * 最近聽緊嗰集未聽完就續播；聽完就播下一集（全部聽完就停喺最後一集）；未聽過就由第一集
 */
export const pickSeriesStart = (
    episodes: readonly SeriesEpisode[],
    progressMap: Readonly<Record<string, Progress>>,
): SeriesEpisode | undefined => {
    const index = lastTouched(episodes, progressMap);
    if (index < 0) return episodes[0];
    const finished = progressMap[episodes[index]?.url ?? '']?.watched ?? false;
    return episodes[finished ? Math.min(index + 1, episodes.length - 1) : index];
};

/** 每日劇集：最新喺頂（重播舊集按佢本身日子排） */
export const dailyNewestFirst = (episodes: readonly DailyEpisode[]): DailyEpisode[] =>
    [...episodes].sort((a, b) => b.date.localeCompare(a.date));

/** 今日有就揀今日，否則今日之前最近一集；全部都喺今日之後就揀最舊嗰集 */
export const pickDailyStart = (
    newestFirst: readonly DailyEpisode[],
    today: string,
): DailyEpisode | undefined => newestFirst.find((e) => e.date <= today) ?? newestFirst.at(-1);

/** 主頁劇集格「New」：每日劇集今日有一集而且未聽完；短篇劇集固定唔變，永遠唔係新 */
export const dramaHasNew = (
    episodes: readonly DramaEpisode[],
    today: string,
    watchedUrls: ReadonlySet<string>,
): boolean => episodes.some((e) => isDaily(e) && e.date === today && !watchedUrls.has(e.url));

/** mini player / 鎖屏嘅副標題：短篇劇集「短篇 · 第 N 集 標題」；每日劇集用日子（重播加「重溫」） */
export const dramaEpisodeLabel = (episode: DramaEpisode): string => {
    if (!isDaily(episode)) {
        const { arc, no, title } = episode;
        return title
            ? t('drama.seriesLabel', { arc, no, title })
            : t('drama.seriesLabelUntitled', { arc, no });
    }
    const date = formatDateLabel(episode.date);
    return episode.rerun ? t('drama.dailyRerunLabel', { date }) : date;
};
