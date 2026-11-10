/* summarizeChanges 嘅短篇劇部份：新短篇 / 新集數（按上架日分組）、短篇落架、短篇欄位改動 */
import type { ChangeEntryRef, ChangeItem, ChangeWhen } from './changeTypes';
import {
    arcIdOf,
    arcRefOf,
    changedKeys,
    episodeCountOf,
    episodeDateOf,
    episodeNosOf,
    isArcListed,
    rawArcs,
    stringField,
    whenOf,
    type RawJson,
} from './rawDefinition';

/** 短篇 edit 唔計嘅欄位：上下架同排程另外有 item（集數變咗嘅 episodes 都係） */
const ARC_HANDLED_KEYS = ['enabled', 'addedAt', 'episodeDates', 'removedAt'];

interface SeriesContext {
    ref: ChangeEntryRef;
    today: string;
}

interface EpisodeRun {
    when: ChangeWhen;
    first: number;
    last: number;
}

const listedArcs = (definition: RawJson | undefined): Map<string, RawJson> =>
    new Map(
        (definition ? rawArcs(definition) : [])
            .filter(isArcListed)
            .map((arc) => [arcIdOf(arc), arc]),
    );

/** 新集數按上架日分段（同一日、連續集數先合埋一段） */
const runsOf = (nos: readonly number[], whenOfNo: (no: number) => ChangeWhen): EpisodeRun[] =>
    nos.reduce<EpisodeRun[]>((runs, no) => {
        const when = whenOfNo(no);
        const last = runs.at(-1);
        if (last && last.when === when && last.last === no - 1) last.last = no;
        else runs.push({ when, first: no, last: no });
        return runs;
    }, []);

/** 一個上架短篇：新短篇 / 新集數 */
const arcEpisodeItems = (
    definition: RawJson,
    arc: RawJson,
    prevArc: RawJson | undefined,
    ctx: SeriesContext,
): ChangeItem[] => {
    const old = new Set(prevArc ? episodeNosOf(prevArc) : []);
    const fresh = episodeNosOf(arc).filter((no) => !old.has(no));
    const base = { entry: ctx.ref, arc: arcRefOf(arc) };
    const runs = runsOf(fresh, (no) => whenOf(episodeDateOf(definition, arc, no), ctx.today));
    // 未知集數嘅新短篇（未上架、未寫 episodes）：淨係報新短篇
    if (!prevArc && runs.length === 0)
        return [
            {
                ...base,
                kind: 'newArc',
                when: whenOf(stringField(arc, 'addedAt'), ctx.today),
                detail: {},
            },
        ];
    return runs.map(({ when, first, last }, i) => ({
        ...base,
        kind: !prevArc && i === 0 ? 'newArc' : 'newEpisodes',
        when,
        detail: { episodes: { first, last } },
    }));
};

/** 短篇下架日新設 / 改咗 → 嗰日落架 */
const arcRemovalItems = (
    arc: RawJson,
    prevArc: RawJson | undefined,
    ctx: SeriesContext,
): ChangeItem[] => {
    const after = stringField(arc, 'removedAt');
    if (after === undefined || after === (prevArc && stringField(prevArc, 'removedAt'))) return [];
    return [
        {
            kind: 'unlist',
            when: whenOf(after, ctx.today),
            entry: ctx.ref,
            arc: arcRefOf(arc),
            detail: { reason: 'removedAt' },
        },
    ];
};

/** 上次上架、今次冇咗 / 停用嘅短篇 */
const unlistedArcItems = (
    prevArcs: ReadonlyMap<string, RawJson>,
    next: RawJson,
    ctx: SeriesContext,
): ChangeItem[] => {
    const nextIds = new Set(rawArcs(next).map(arcIdOf));
    const nowListed = listedArcs(next);
    return [...prevArcs.values()]
        .filter((arc) => !nowListed.has(arcIdOf(arc)))
        .map((arc) => ({
            kind: 'unlist',
            when: 'now',
            entry: ctx.ref,
            arc: arcRefOf(arc),
            detail: { reason: nextIds.has(arcIdOf(arc)) ? 'disabled' : 'deleted' },
        }));
};

/** prev = undefined：上次未上架（新劇 / 重新上架），全部短篇當新 */
export const seriesArcChanges = (
    prev: RawJson | undefined,
    next: RawJson,
    ctx: SeriesContext,
): ChangeItem[] => {
    const prevArcs = listedArcs(prev);
    const listed = rawArcs(next).filter(isArcListed);
    return [
        ...listed.flatMap((arc) => {
            const prevArc = prevArcs.get(arcIdOf(arc));
            return [
                ...arcEpisodeItems(next, arc, prevArc, ctx),
                ...arcRemovalItems(arc, prevArc, ctx),
            ];
        }),
        ...unlistedArcItems(prevArcs, next, ctx),
    ];
};

/** 兩次都上架嘅短篇改咗邊啲欄位（`arcs.<id>.<key>`） */
export const arcEditFields = (prev: RawJson, next: RawJson): string[] => {
    const prevArcs = listedArcs(prev);
    return rawArcs(next)
        .filter(isArcListed)
        .flatMap((arc) => {
            const prevArc = prevArcs.get(arcIdOf(arc));
            if (!prevArc) return [];
            const countChanged = episodeCountOf(prevArc) !== episodeCountOf(arc);
            const ignore = new Set([...ARC_HANDLED_KEYS, ...(countChanged ? ['episodes'] : [])]);
            return changedKeys(prevArc, arc, ignore).map((key) => `arcs.${arcIdOf(arc)}.${key}`);
        });
};
