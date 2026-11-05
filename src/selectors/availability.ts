/*
 * 上架 / 下架（P8 #6，_mockups_/coming-soon ⑤ ⑧）：全部係 pure function，today = hkToday()（YYYY-MM-DD）。
 * 上架 = addedAt 當日 HK 00:00 起；下架 = removedAt 當日 HK 00:00 起唔再提供。
 * YYYY-MM-DD 字串比較就係日子先後
 */
import { LEAVING_SOON_DAYS } from '../config/constants';
import type { ArcAvailability, DramaEpisode, EpisodeRange, SeriesEpisode } from '../types/drama';
import { daysBetween } from '../utils/date';

type MaybeDate = string | undefined;

const defined = (dates: readonly MaybeDate[]): string[] =>
    dates.filter((d): d is string => d !== undefined).sort();

/** 最早嗰個日子（冇就 undefined）：一集嘅有效下架日 = 三層最早 */
export const earliestDate = (dates: readonly MaybeDate[]): MaybeDate => defined(dates)[0];

/** 最遲嗰個日子：一集嘅有效上架日 = 三層最遲 */
export const latestDate = (dates: readonly MaybeDate[]): MaybeDate => defined(dates).at(-1);

/** 未上架：addedAt 係將來日子（同 isArcNew 一樣用 hkToday） */
export const isArcUpcoming = (addedAt: MaybeDate, today: string): boolean =>
    addedAt !== undefined && addedAt > today;

/** 已下架：今日係 removedAt 當日或之後 */
export const isRemoved = (removedAt: MaybeDate, today: string): boolean =>
    removedAt !== undefined && today >= removedAt;

/** 快將下架：未到下架日，而且相差 LEAVING_SOON_DAYS 日或以內 */
export const isLeavingSoon = (removedAt: MaybeDate, today: string): boolean =>
    removedAt !== undefined &&
    today < removedAt &&
    daysBetween(today, removedAt) <= LEAVING_SOON_DAYS;

export interface DateWindow {
    addedAt?: MaybeDate;
    removedAt?: MaybeDate;
}

/**
 * catalog 入面已上架嘅集數（包括已下架，進度唔刪）：主頁書架排位、續聽揀集用，
 * 下架之後排位唔郁（W-531）。每日劇只有劇集層日子，未上架嘅劇唔會上書架，全部照計
 */
export const releasedEpisodes = <E extends DramaEpisode>(
    episodes: readonly E[],
    today: string,
): E[] => episodes.filter((e) => e.kind !== 'series' || !isArcUpcoming(e.addedAt, today));

/** 上咗架又未落架 */
export const isAvailable = (window: DateWindow, today: string): boolean =>
    !isArcUpcoming(window.addedAt, today) && !isRemoved(window.removedAt, today);

/** 即將上架嘅短篇（全集一覽表「即將上架」組、chips 最尾）：集數未知就冇 count */
export interface UpcomingArc {
    arc: string;
    addedAt: string;
    count?: number;
}

const warned = new Set<string>();

/** 過咗上架日仲未補 episodes：照當未上架（唔出空短篇），console.warn 一次提醒加劇嘅人 */
const warnMissingEpisodes = (arc: ArcAvailability) => {
    if (warned.has(arc.arc)) return;
    warned.add(arc.arc);
    console.warn(`drama arc ${arc.arc}: addedAt ${arc.addedAt} has passed but episodes is missing`);
};

const toUpcoming = (arc: ArcAvailability, today: string): UpcomingArc[] => {
    const { addedAt, count } = arc;
    if (addedAt === undefined) return [];
    if (count === undefined && !isArcUpcoming(addedAt, today)) warnMissingEpisodes(arc);
    if (count !== undefined && !isArcUpcoming(addedAt, today)) return [];
    return [{ arc: arc.arc, addedAt, ...(count === undefined ? {} : { count }) }];
};

/** 未上架嘅短篇（catalog 次序） */
export const upcomingArcs = (arcs: readonly ArcAvailability[], today: string): UpcomingArc[] =>
    arcs.flatMap((arc) => toUpcoming(arc, today));

/** 一個已上架短篇仲未到期嘅逐集批次（每批 first–last） */
export const pendingBatches = (arc: ArcAvailability, today: string): EpisodeRange[] =>
    arc.batches.filter((b) => isArcUpcoming(b.date, today));

/** 主頁劇集格字尾：最快上架嘅新短篇（arc）或者新一批集數（episodes） */
export interface NextRelease {
    kind: 'arc' | 'episodes';
    date: string;
}

const arcReleases = (arcs: readonly ArcAvailability[], today: string): NextRelease[] =>
    upcomingArcs(arcs, today).map(({ addedAt }) => ({ kind: 'arc', date: addedAt }));

const batchReleases = (arcs: readonly ArcAvailability[], today: string): NextRelease[] =>
    arcs
        .filter((arc) => !isArcUpcoming(arc.addedAt, today))
        .flatMap((arc) => pendingBatches(arc, today))
        .map(({ date }) => ({ kind: 'episodes', date }));

/** 最早嗰個；同一日新短篇排先 */
export const nextRelease = (
    arcs: readonly ArcAvailability[],
    today: string,
): NextRelease | undefined =>
    [...arcReleases(arcs, today), ...batchReleases(arcs, today)].sort((a, b) =>
        a.date.localeCompare(b.date),
    )[0];

/** 短篇「新」嘅起計日：已上架集數入面最遲嗰批（新一批集數上架都出 14 日「新」） */
export const arcFreshDate = (inArc: readonly SeriesEpisode[]): MaybeDate =>
    latestDate(inArc.map((e) => e.addedAt));

/**
 * 下層（短篇 / 集）嘅下架日係咪已經由上層（成套劇 / 左上角）講咗：同一日就係。
 * 同一個位只出較高一層（劇集頁「全集」chip、主頁格繼續收聽條共用）
 */
export const sameRemovalDay = (outer: MaybeDate, inner: string): boolean =>
    outer !== undefined && outer === inner;

/** 快將下架嘅範圍：成套劇 / 部分短篇 / 部分集數 */
export type LeavingScope = 'drama' | 'arc' | 'episodes';

export interface Leaving {
    scope: LeavingScope;
    date: string;
}

/** 某短篇自己快將下架嘅集數範圍 */
export const leavingRanges = (arc: ArcAvailability, today: string): EpisodeRange[] =>
    arc.removals.filter((r) => isLeavingSoon(r.date, today));

/** 一個短篇（chips / 一覽表）：短篇自己快將下架；唔係就睇有冇集數範圍快將下架 */
export const arcLeaving = (
    arc: ArcAvailability,
    today: string,
): (Leaving & Partial<Pick<EpisodeRange, 'first' | 'last'>>) | undefined => {
    if (isLeavingSoon(arc.removedAt, today)) return { scope: 'arc', date: arc.removedAt ?? '' };
    const [range, ...others] = leavingRanges(arc, today);
    if (!range) return undefined;
    const date = earliestDate([range.date, ...others.map((r) => r.date)]) ?? range.date;
    // 得一段先講第幾集；幾段就淨係講「部分集數」
    return others.length > 0
        ? { scope: 'episodes', date }
        : { scope: 'episodes', date, first: range.first, last: range.last };
};

const earliestLeaving = (scope: LeavingScope, dates: readonly MaybeDate[]): Leaving | undefined => {
    const date = earliestDate(dates);
    return date === undefined ? undefined : { scope, date };
};

/** 主頁劇集格左上角：成套劇 → 部分短篇 → 部分集數（只計書架上有嘅短篇），日子取最早 */
export const dramaLeaving = (
    drama: DateWindow,
    arcs: readonly ArcAvailability[],
    today: string,
): Leaving | undefined => {
    if (isLeavingSoon(drama.removedAt, today))
        return { scope: 'drama', date: drama.removedAt ?? '' };
    const shelved = arcs.filter((arc) => isAvailable(arc, today));
    const arcDates = shelved
        .filter((a) => isLeavingSoon(a.removedAt, today))
        .map((a) => a.removedAt);
    const rangeDates = shelved.flatMap((a) => leavingRanges(a, today)).map((r) => r.date);
    return earliestLeaving('arc', arcDates) ?? earliestLeaving('episodes', rangeDates);
};
