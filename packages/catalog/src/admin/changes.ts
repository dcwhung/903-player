/*
 * 兩份 catalog document 嘅變更摘要（admin 確認發佈時間線 + 上下架記錄共用）：
 * 新節目 / 新劇 / 新短篇 / 新集數（按上架日分組）、落架（停用、刪除、下架日）、其他改動（列出欄位）。
 * definition 唔 parse（唔合格嘅 document 都要比較得），規則同 player 一樣：節目 enabled 冇 = 上架，
 * 劇集 enabled 要係 true，短篇 enabled 冇 = 上架
 */
import type { CatalogEntry, CatalogKind } from '../document/document';
import type {
    ChangeDocument,
    ChangeEntryRef,
    ChangeItem,
    ChangeSummary,
    ChangeTimelineGroup,
    SummarizeOptions,
} from './changeTypes';
import { editItemsFor, imageEditFields } from './editChanges';
import { arcEditFields, seriesArcChanges } from './seriesChanges';
import { changedKeys, nameOf, stringField, whenOf, type RawJson } from './rawDefinition';

const NOW = 'now';
/** 頂層 edit 唔計嘅欄位：上下架 / 集數另外有自己嘅 item */
const ENTRY_HANDLED_KEYS: ReadonlySet<string> = new Set([
    'enabled',
    'removedAt',
    'arcs',
    'episodes',
]);

interface EntryPair {
    kind: CatalogKind;
    prev: CatalogEntry | undefined;
    next: CatalogEntry | undefined;
    today: string;
}

const isListed = (kind: CatalogKind, definition: RawJson | undefined): boolean => {
    if (definition === undefined) return false;
    return kind === 'shows' ? definition.enabled !== false : definition.enabled === true;
};

const refOf = (kind: CatalogKind, entry: CatalogEntry): ChangeEntryRef => ({
    kind,
    id: entry.id,
    name: nameOf(entry.definition, entry.id),
});

/** 頂層欄位 + 換咗邊張圖（editChanges.ts） */
const editedFields = (prev: CatalogEntry, next: CatalogEntry): string[] => [
    ...changedKeys(prev.definition, next.definition, ENTRY_HANDLED_KEYS),
    ...imageEditFields(prev, next),
];

const newEntryItem = ({ kind, next, today }: EntryPair, entry: CatalogEntry): ChangeItem => ({
    kind: kind === 'shows' ? 'newShow' : 'newDrama',
    when: kind === 'shows' ? NOW : whenOf(stringField(entry.definition, 'addedAt'), today),
    entry: refOf(kind, next ?? entry),
    detail: {},
});

const unlistItem = ({ kind, next }: EntryPair, entry: CatalogEntry): ChangeItem => ({
    kind: 'unlist',
    when: NOW,
    entry: refOf(kind, next ?? entry),
    detail: { reason: next ? 'disabled' : 'deleted' },
});

/** 劇集下架日新設 / 改咗 → 嗰日落架 */
const removalItem = (pair: EntryPair, entry: CatalogEntry): ChangeItem[] => {
    const before = pair.prev ? stringField(pair.prev.definition, 'removedAt') : undefined;
    const after = stringField(entry.definition, 'removedAt');
    if (after === undefined || after === before) return [];
    const ref = refOf(pair.kind, entry);
    return [
        {
            kind: 'unlist',
            when: whenOf(after, pair.today),
            entry: ref,
            detail: { reason: 'removedAt' },
        },
    ];
};

/** 每日劇：新日子 */
const dailyItems = (pair: EntryPair, entry: CatalogEntry): ChangeItem[] => {
    const datesOf = (e: CatalogEntry | undefined) =>
        Array.isArray(e?.definition.episodes)
            ? (e.definition.episodes as RawJson[]).flatMap((ep) => stringField(ep, 'date') ?? [])
            : [];
    const old = new Set(isListed(pair.kind, pair.prev?.definition) ? datesOf(pair.prev) : []);
    const dates = datesOf(entry)
        .filter((d) => !old.has(d))
        .sort();
    if (dates.length === 0) return [];
    return [{ kind: 'newEpisodes', when: NOW, entry: refOf(pair.kind, entry), detail: { dates } }];
};

/** 上架緊（今次 listed）嘅劇集 / 節目：新、下架日、集數、改動 */
const listedItems = (pair: EntryPair, entry: CatalogEntry): ChangeItem[] => {
    const wasListed = isListed(pair.kind, pair.prev?.definition);
    const head = wasListed ? [] : [newEntryItem(pair, entry)];
    if (pair.kind === 'shows') return head;
    const prev = wasListed ? pair.prev : undefined;
    const ref = refOf(pair.kind, entry);
    const episodes =
        entry.definition.kind === 'daily'
            ? dailyItems(pair, entry)
            : seriesArcChanges(prev?.definition, entry.definition, { ref, today: pair.today });
    return [...head, ...removalItem(pair, entry), ...episodes];
};

const editItems = (pair: EntryPair): ChangeItem[] => {
    const { prev, next } = pair;
    if (!prev || !next || !isListed(pair.kind, prev.definition)) return [];
    if (!isListed(pair.kind, next.definition)) return [];
    const fields = [
        ...editedFields(prev, next),
        ...(pair.kind === 'dramas' ? arcEditFields(prev.definition, next.definition) : []),
    ];
    return editItemsFor(refOf(pair.kind, next), next.definition, fields);
};

const entryItems = (pair: EntryPair): ChangeItem[] => {
    const { prev, next } = pair;
    if (next && isListed(pair.kind, next.definition))
        return [...listedItems(pair, next), ...editItems(pair)];
    if (prev && isListed(pair.kind, prev.definition)) return [unlistItem(pair, prev)];
    return [];
};

/** 次序：next 嘅次序，之後係 next 冇咗嘅（刪咗） */
const pairsOf = (
    kind: CatalogKind,
    prev: ChangeDocument | null,
    next: ChangeDocument,
    today: string,
) => {
    const before = new Map((prev?.[kind] ?? []).map((e) => [e.id, e]));
    const after = new Map(next[kind].map((e) => [e.id, e]));
    const ids = [...after.keys(), ...[...before.keys()].filter((id) => !after.has(id))];
    return ids.map((id): EntryPair => ({ kind, prev: before.get(id), next: after.get(id), today }));
};

const timelineOf = (items: readonly ChangeItem[]): ChangeTimelineGroup[] => {
    const groups = new Map<string, ChangeItem[]>();
    items.forEach((item) => groups.set(item.when, [...(groups.get(item.when) ?? []), item]));
    return [...groups.entries()]
        .sort(([a], [b]) => (a === NOW ? -1 : b === NOW ? 1 : a.localeCompare(b)))
        .map(([when, grouped]) => ({ when, items: grouped }));
};

/** prev = null：第一次發佈（全部上架嘅都當新） */
export const summarizeChanges = (
    prev: ChangeDocument | null,
    next: ChangeDocument,
    today: string,
    options: SummarizeOptions = {},
): ChangeSummary => {
    const rollback: ChangeItem[] =
        options.rollbackOf == null
            ? []
            : [{ kind: 'rollback', when: NOW, detail: { publishId: options.rollbackOf } }];
    const items = [
        ...rollback,
        ...(['shows', 'dramas'] as const).flatMap((kind) =>
            pairsOf(kind, prev, next, today).flatMap(entryItems),
        ),
    ];
    return { items, timeline: timelineOf(items) };
};
