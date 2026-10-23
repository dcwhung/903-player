import type { Progress } from '../services/progressStore';
import type { SeriesEpisode } from '../types/drama';
import { ratio } from '../utils/ratio';
import { episodesInArc, pickSeriesStart, seriesArcs } from './dramas';

type ProgressMap = Readonly<Record<string, Progress>>;

/** done 全部聽完；started 聽過任何一集（或者聽緊）；new 一集都未掂 */
export type ArcState = 'done' | 'started' | 'new';

/** 「全部短篇」一覽表每一行 */
export interface ArcSummary {
    arc: string;
    total: number;
    /** 聽完幾多集 */
    watched: number;
    state: ArcState;
    /** 撳右邊播放掣播邊集：第一集未聽完嘅（續聽 / 未收聽）；全部聽完就由第 1 集重聽 */
    resume: SeriesEpisode;
    /** resume 嗰集聽到幾多秒（續聽先有） */
    resumeAt: number;
}

const arcState = (watched: number, total: number, touched: boolean): ArcState => {
    if (watched === total) return 'done';
    return touched ? 'started' : 'new';
};

const summarise = (episodes: SeriesEpisode[], progressMap: ProgressMap): ArcSummary | undefined => {
    const [first] = episodes;
    if (!first) return undefined;
    const watched = episodes.filter((e) => progressMap[e.url]?.watched).length;
    const touched = episodes.some((e) => progressMap[e.url] !== undefined);
    const state = arcState(watched, episodes.length, touched);
    const unfinished = episodes.find((e) => !progressMap[e.url]?.watched);
    const resume = state === 'done' ? first : (unfinished ?? first);
    const resumeAt = state === 'done' ? 0 : (progressMap[resume.url]?.position ?? 0);
    return { arc: first.arc, total: episodes.length, watched, state, resume, resumeAt };
};

/** 每個短篇嘅進度（按 catalogue 次序），聽完嘅排最底 */
export const arcSummaries = (
    episodes: readonly SeriesEpisode[],
    progressMap: ProgressMap,
): ArcSummary[] => {
    const summaries = seriesArcs(episodes).flatMap(
        (arc) => summarise(episodesInArc(episodes, arc), progressMap) ?? [],
    );
    return [
        ...summaries.filter((s) => s.state !== 'done'),
        ...summaries.filter((s) => s.state === 'done'),
    ];
};

/** 主頁劇集格「繼續收聽」：播邊集、嗰集聽到幾多（0–1）；一集都未聽過就冇 */
export const seriesContinue = (
    episodes: readonly SeriesEpisode[],
    progressMap: ProgressMap,
): { episode: SeriesEpisode; ratio: number } | undefined => {
    if (!episodes.some((e) => progressMap[e.url] !== undefined)) return undefined;
    const episode = pickSeriesStart(episodes, progressMap);
    if (!episode) return undefined;
    const progress = progressMap[episode.url];
    const shown = progress && !progress.watched ? ratio(progress.position, progress.duration) : 0;
    return { episode, ratio: shown };
};
