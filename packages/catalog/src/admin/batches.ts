/*
 * 排程「上架批次」對比（admin 排程 tab）：已經上架嘅批次 vs 新規則展開（expandSchedule）。
 * 已上架集數嘅日子喺新規則下唔同 → admin 出「上架批次」表畀人確認（已聽緊嘅集可能會變返未上架）
 */
import type { EpisodeRange } from '../types/drama';

/** arc JSON 嘅排程欄位（未驗證；同 ExpandedSchedule 一樣形狀） */
export interface ArcSchedule {
    addedAt?: string | undefined;
    /** 集數 → 「呢集起」上架日（第二批起） */
    episodeDates?: Readonly<Record<string, string>> | undefined;
}

export interface ArcSpan {
    firstNo: number;
    count: number;
}

export interface BatchComparison {
    /** 而家 definition 入面已經上架（日子 ≤ today）嘅批次 */
    released: EpisodeRange[];
    /** 新規則展開嘅全部批次 */
    planned: EpisodeRange[];
    /** 有已上架集數嘅日子變咗 */
    differs: boolean;
    /** 日子變咗嘅已上架集數（細到大） */
    changedEpisodes: number[];
}

/** addedAt（第一批）+ episodeDates → 每批 first–last；冇 addedAt 就冇批次 */
export const batchesOf = (schedule: ArcSchedule, arc: ArcSpan): EpisodeRange[] => {
    if (schedule.addedAt === undefined) return [];
    const later = Object.entries(schedule.episodeDates ?? {})
        .map(([no, date]) => ({ from: Number(no), date }))
        .filter(({ from }) => from > arc.firstNo)
        .sort((a, b) => a.from - b.from);
    const starts = [{ from: arc.firstNo, date: schedule.addedAt }, ...later];
    const lastNo = arc.firstNo + arc.count - 1;
    return starts.map((start, i) => ({
        first: start.from,
        last: (starts[i + 1]?.from ?? lastNo + 1) - 1,
        date: start.date,
    }));
};

const dateOf = (batches: readonly EpisodeRange[], no: number): string | undefined =>
    batches.find((b) => no >= b.first && no <= b.last)?.date;

const episodesIn = ({ first, last }: EpisodeRange): number[] =>
    Array.from({ length: last - first + 1 }, (_, i) => first + i);

/** 已上架批次 vs 新規則（today = 香港今日，當日上架嘅都算已上架） */
export const compareBatches = (
    current: ArcSchedule,
    expanded: ArcSchedule,
    arc: ArcSpan,
    today: string,
): BatchComparison => {
    const released = batchesOf(current, arc).filter((b) => b.date <= today);
    const planned = batchesOf(expanded, arc);
    const changedEpisodes = released
        .flatMap(episodesIn)
        .filter((no) => dateOf(planned, no) !== dateOf(released, no));
    return { released, planned, differs: changedEpisodes.length > 0, changedEpisodes };
};
