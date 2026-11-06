/*
 * drama.json 上架 / 下架欄位（P8 #6，_mockups_/coming-soon ⑤）：
 * episodeDates（逐集上架，「呢集起」日子）、episodeRemovedAt（集數下架，單集 "3" 或範圍 "1-5"），
 * 同三層 addedAt / removedAt 嘅先後驗證。日子係 YYYY-MM-DD，字串比較就係日子先後
 */
import { fail, readOptionalDate, readRecord, type ParseContext, type Raw } from '../../core/reader';
import { isCalendarDate } from '../../../utils/date';

import type { EpisodeRange } from '../../../types/drama';

export type { EpisodeRange } from '../../../types/drama';

export interface EpisodeSpan {
    first: number;
    last: number;
}

/** 上架 / 下架日：日子係 HK 當日 00:00 起計 */
export interface DateWindow {
    addedAt?: string | undefined;
    removedAt?: string | undefined;
}

const RANGE_KEY = /^(\d+)(?:-(\d+))?$/;

const readDateValue = (ctx: ParseContext, value: unknown, path: string): string =>
    typeof value === 'string' && isCalendarDate(value)
        ? value
        : fail(ctx, `${path} must be a YYYY-MM-DD date`);

const checkInside = (ctx: ParseContext, path: string, span: EpisodeSpan, range: EpisodeSpan) => {
    if (span.first < range.first || span.last > range.last)
        fail(ctx, `${path} is outside ${range.first}–${range.last}`);
};

/** 下架日要遲過上架日（同一日 = 一上架就落架，冇意思） */
export const checkRemovedAfter = (
    ctx: ParseContext,
    path: string,
    removedAt: string | undefined,
    addedAt: string | undefined,
): void => {
    if (removedAt && addedAt && removedAt <= addedAt)
        fail(ctx, `${path} must be later than addedAt ${addedAt}`);
};

/** 下層下架日唔可以遲過上層（上層落咗架，下層都一齊冇） */
export const checkNotAfter = (
    ctx: ParseContext,
    path: string,
    removedAt: string | undefined,
    outer: { label: string; date: string | undefined },
): void => {
    if (removedAt && outer.date && removedAt > outer.date)
        fail(ctx, `${path} must not be later than the ${outer.label} removedAt ${outer.date}`);
};

/** 一層嘅 addedAt / removedAt（removedAt 要遲過 addedAt；inheritedAddedAt = 上層上架日） */
export const readWindow = (
    ctx: ParseContext,
    raw: Raw,
    prefix: string,
    inheritedAddedAt?: string,
): DateWindow => {
    const addedAt = readOptionalDate(ctx, raw, 'addedAt', `${prefix}addedAt`);
    const removedAt = readOptionalDate(ctx, raw, 'removedAt', `${prefix}removedAt`);
    checkRemovedAfter(ctx, `${prefix}removedAt`, removedAt, addedAt ?? inheritedAddedAt);
    return { addedAt, removedAt };
};

interface ArcRangeContext {
    path: string;
    range: EpisodeSpan;
    /** arc 實際上架日（arc 自己，冇就劇集嘅） */
    addedAt: string | undefined;
}

/** 一個 episodeDates 項目：key 喺範圍入面（唔可以係第一集，第一批用 arc addedAt）、日子遲過上一批 */
const readBatch = (
    ctx: ParseContext,
    [key, value]: [string, unknown],
    arc: ArcRangeContext,
    previous: { no: number; date: string | undefined },
): [number, string] => {
    const path = `${arc.path}["${key}"]`;
    const no = Number(key);
    if (!Number.isInteger(no)) fail(ctx, `${path} must be an episode number`);
    checkInside(ctx, path, { first: no, last: no }, arc.range);
    if (no === arc.range.first) fail(ctx, `${path} must be after the first episode`);
    const date = readDateValue(ctx, value, path);
    if (previous.date && date <= previous.date)
        fail(ctx, `${path} must be later than episode ${previous.no}'s date`);
    if (!previous.date && arc.addedAt && date <= arc.addedAt)
        fail(ctx, `${path} must be later than addedAt ${arc.addedAt}`);
    return [no, date];
};

/** episodeDates：集數 → 「呢集起」上架日，跟集數遞增 */
export const readEpisodeDates = (
    ctx: ParseContext,
    raw: Raw,
    arc: ArcRangeContext,
): ReadonlyMap<number, string> => {
    const dates = new Map<number, string>();
    if (raw.episodeDates === undefined) return dates;
    const entries = Object.entries(readRecord(ctx, raw.episodeDates, arc.path)).sort(
        ([a], [b]) => Number(a) - Number(b),
    );
    let previous: { no: number; date: string | undefined } = { no: 0, date: undefined };
    entries.forEach((entry) => {
        const [no, date] = readBatch(ctx, entry, arc, previous);
        dates.set(no, date);
        previous = { no, date };
    });
    return dates;
};

/** 某集嘅上架日：佢之前（或者佢自己）最遲嗰批，冇就 arc 上架日 */
export const batchDateOf = (
    episodeDates: ReadonlyMap<number, string>,
    no: number,
    arcAddedAt: string | undefined,
): string | undefined => [...episodeDates].filter(([from]) => from <= no).at(-1)?.[1] ?? arcAddedAt;

const parseRangeKey = (ctx: ParseContext, key: string, path: string): EpisodeSpan => {
    const match = RANGE_KEY.exec(key);
    const first = Number(match?.[1]);
    const last = match?.[2] === undefined ? first : Number(match[2]);
    if (!match || last < first)
        fail(ctx, `${path} must be an episode number or a range like "1-5"`);
    return { first, last };
};

const overlaps = (a: EpisodeSpan, b: EpisodeSpan): boolean =>
    a.first <= b.last && b.first <= a.last;

interface RemovalContext extends ArcRangeContext {
    episodeDates: ReadonlyMap<number, string>;
    /** arc 實際下架日（arc 自己，冇就劇集嘅） */
    removedAt: string | undefined;
}

const readRemoval = (
    ctx: ParseContext,
    [key, value]: [string, unknown],
    arc: RemovalContext,
    seen: readonly EpisodeRange[],
): EpisodeRange => {
    const path = `${arc.path}["${key}"]`;
    const span = parseRangeKey(ctx, key, path);
    checkInside(ctx, path, span, arc.range);
    if (seen.some((other) => overlaps(other, span))) fail(ctx, `${path} overlaps another range`);
    const date = readDateValue(ctx, value, path);
    // 範圍入面最遲上架嗰集都要喺下架前上咗架
    const released = batchDateOf(arc.episodeDates, span.last, arc.addedAt);
    if (released && date <= released) fail(ctx, `${path} must be later than ${released}`);
    checkNotAfter(ctx, path, date, { label: 'arc', date: arc.removedAt });
    return { ...span, date };
};

/** episodeRemovedAt：單集 "3" 或範圍 "1-5" → 下架日；範圍唔可以重疊 */
export const readEpisodeRemovals = (
    ctx: ParseContext,
    raw: Raw,
    arc: RemovalContext,
): readonly EpisodeRange[] => {
    if (raw.episodeRemovedAt === undefined) return [];
    const entries = Object.entries(readRecord(ctx, raw.episodeRemovedAt, arc.path));
    return entries.reduce<EpisodeRange[]>(
        (seen, entry) => [...seen, readRemoval(ctx, entry, arc, seen)],
        [],
    );
};
