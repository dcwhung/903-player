/*
 * summarizeChanges 用嘅 raw definition helper：document 未必驗證過（GET /api/changes 要連唔合格嘅都比較），
 * 所以唔 parse，逐個欄位小心讀
 */
import type { ChangeArcRef, ChangeWhen } from './changeTypes';

export type RawJson = Readonly<Record<string, unknown>>;

const DEFAULT_FIRST_NO = 1;

export const isRawRecord = (value: unknown): value is RawJson =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const stringField = (raw: RawJson, key: string): string | undefined =>
    typeof raw[key] === 'string' ? raw[key] : undefined;

export const nameOf = (raw: RawJson, fallback: string): string =>
    stringField(raw, 'name') ?? fallback;

/** 未來日子 → 嗰日；今日或之前 / 冇 → 'now' */
export const whenOf = (date: string | undefined, today: string): ChangeWhen =>
    date !== undefined && date > today ? date : 'now';

export const rawArcs = (definition: RawJson): RawJson[] =>
    Array.isArray(definition.arcs) ? definition.arcs.filter(isRawRecord) : [];

export const arcIdOf = (arc: RawJson): string => stringField(arc, 'id') ?? nameOf(arc, '');

export const arcRefOf = (arc: RawJson): ChangeArcRef => {
    const name = nameOf(arc, '');
    return { id: arcIdOf(arc), name, label: stringField(arc, 'displayName') ?? name };
};

export const isArcListed = (arc: RawJson): boolean => arc.enabled !== false;

export const firstNoOf = (arc: RawJson): number =>
    typeof arc.firstNo === 'number' ? arc.firstNo : DEFAULT_FIRST_NO;

export const episodeCountOf = (arc: RawJson): number => {
    const { episodes } = arc;
    if (typeof episodes === 'number') return episodes;
    return Array.isArray(episodes) ? episodes.length : 0;
};

export const episodeNosOf = (arc: RawJson): number[] =>
    Array.from({ length: episodeCountOf(arc) }, (_, i) => firstNoOf(arc) + i);

/** 一集幾時上架：劇集、短篇、逐集批次三層最遲嗰個（同 dramas/episodes.ts 一樣規則） */
export const episodeDateOf = (drama: RawJson, arc: RawJson, no: number): string | undefined => {
    const batches = isRawRecord(arc.episodeDates) ? arc.episodeDates : {};
    const batch = Object.entries(batches)
        .filter(([from, date]) => Number(from) <= no && typeof date === 'string')
        .sort(([a], [b]) => Number(a) - Number(b))
        .at(-1)?.[1] as string | undefined;
    const dates = [stringField(drama, 'addedAt'), stringField(arc, 'addedAt'), batch];
    return dates
        .filter((d): d is string => d !== undefined)
        .sort()
        .at(-1);
};

const canonical = (value: unknown): string =>
    JSON.stringify(value, (_key, v: unknown) =>
        isRawRecord(v)
            ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
            : v,
    );

/** 兩個 JSON 值一唔一樣（key 次序唔算） */
export const sameJson = (a: unknown, b: unknown): boolean => canonical(a) === canonical(b);

/** 兩個 object 有邊啲 key 唔同（略過 ignore 入面嘅） */
export const changedKeys = (
    before: RawJson,
    after: RawJson,
    ignore: ReadonlySet<string>,
): string[] =>
    [...new Set([...Object.keys(before), ...Object.keys(after)])]
        .filter((key) => !ignore.has(key) && !sameJson(before[key], after[key]))
        .sort();
