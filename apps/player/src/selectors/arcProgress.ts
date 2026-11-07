import { arcFreshDate, daysBetween, type SeriesEpisode } from '@903-player/catalog';
import { NEW_ARC_DAYS } from '../config/constants';
import type { Progress } from '../services/progressStore';
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
    /** 上架 NEW_ARC_DAYS 日內：chip / 一覽表出「新」 */
    isNew: boolean;
    /** 撳右邊播放掣播邊集：第一集未聽完嘅（續聽 / 未收聽）；全部聽完就由第 1 集重聽 */
    resume: SeriesEpisode;
    /** resume 嗰集聽到幾多秒（續聽先有） */
    resumeAt: number;
}

const arcState = (watched: number, total: number, touched: boolean): ArcState => {
    if (watched === total) return 'done';
    return touched ? 'started' : 'new';
};

/** 上架當日起計 NEW_ARC_DAYS 日內係新短篇；冇上架日子（而家嗰 10 個）當舊 */
export const isArcNew = (addedAt: string | undefined, today: string): boolean => {
    if (!addedAt) return false;
    const age = daysBetween(addedAt, today);
    return age >= 0 && age < NEW_ARC_DAYS;
};

const summarise = (
    episodes: SeriesEpisode[],
    progressMap: ProgressMap,
    today: string,
): ArcSummary | undefined => {
    const [first] = episodes;
    if (!first) return undefined;
    const watched = episodes.filter((e) => progressMap[e.id]?.watched).length;
    const touched = episodes.some((e) => progressMap[e.id] !== undefined);
    const state = arcState(watched, episodes.length, touched);
    const unfinished = episodes.find((e) => !progressMap[e.id]?.watched);
    const resume = state === 'done' ? first : (unfinished ?? first);
    const resumeAt = state === 'done' ? 0 : (progressMap[resume.id]?.position ?? 0);
    // 新一批集數上架都算「新」：用已上架集數最遲嗰批計
    const isNew = isArcNew(arcFreshDate(episodes), today);
    return { arc: first.arc, total: episodes.length, watched, state, isNew, resume, resumeAt };
};

/** 每個短篇嘅進度，按 catalogue 次序（排法見 arcGroups） */
export const arcSummaries = (
    episodes: readonly SeriesEpisode[],
    progressMap: ProgressMap,
    today: string,
): ArcSummary[] =>
    seriesArcs(episodes).flatMap(
        (arc) => summarise(episodesInArc(episodes, arc), progressMap, today) ?? [],
    );

export type ArcGroup = 'playing' | 'new' | 'unfinished' | 'done';

/**
 * 每個短篇屬於邊組：載入緊 → 播放中；新上架（未聽完）→ 新上架；聽完 → 已收聽；其他 → 未聽完。
 * 聽晒已上架嘅集數但仲有下一批未上架（pending）唔算聽完，排返未聽完
 */
const groupOf = (
    s: ArcSummary,
    playingArc: string | undefined,
    pending: ReadonlySet<string>,
): ArcGroup => {
    if (s.arc === playingArc) return 'playing';
    if (s.state === 'done' && !pending.has(s.arc)) return 'done';
    return s.isNew ? 'new' : 'unfinished';
};

const GROUP_ORDER: readonly ArcGroup[] = ['playing', 'new', 'unfinished', 'done'];

/** 全集一覽表 / chips 嘅次序：播放中 → 新上架 → 未聽完 → 已收聽（組內照 catalogue 次序；冇嘢嘅組唔出） */
export const arcGroups = (
    summaries: readonly ArcSummary[],
    playingArc: string | undefined,
    pending: ReadonlySet<string> = new Set(),
): { group: ArcGroup; items: ArcSummary[] }[] =>
    GROUP_ORDER.map((group) => ({
        group,
        items: summaries.filter((s) => groupOf(s, playingArc, pending) === group),
    })).filter((g) => g.items.length > 0);

/** 某短篇最新上架嗰批集數（成個短篇一齊上架就係全部） */
const latestBatch = (inArc: readonly SeriesEpisode[]): SeriesEpisode[] => {
    const fresh = arcFreshDate(inArc);
    return inArc.filter((e) => e.addedAt === fresh);
};

/** 主頁劇集格「新」：有新上架短篇（或者新一批集數）而且嗰批一集都未掂過 */
export const hasNewUnheardArc = (
    episodes: readonly SeriesEpisode[],
    progressMap: ProgressMap,
    today: string,
): boolean =>
    seriesArcs(episodes).some((arc) => {
        const inArc = episodesInArc(episodes, arc);
        return (
            isArcNew(arcFreshDate(inArc), today) &&
            latestBatch(inArc).every((e) => progressMap[e.id] === undefined)
        );
    });

/** 主頁劇集格「繼續收聽」：播邊集、嗰集聽到幾多（0–1）；一集都未聽過就冇 */
export const seriesContinue = (
    episodes: readonly SeriesEpisode[],
    progressMap: ProgressMap,
): { episode: SeriesEpisode; ratio: number } | undefined => {
    if (!episodes.some((e) => progressMap[e.id] !== undefined)) return undefined;
    const episode = pickSeriesStart(episodes, progressMap);
    if (!episode) return undefined;
    const progress = progressMap[episode.id];
    const shown = progress && !progress.watched ? ratio(progress.position, progress.duration) : 0;
    return { episode, ratio: shown };
};
