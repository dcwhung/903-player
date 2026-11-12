/* 內容列表：上架（可拖）/ 未上架（draft）/ 已下架（固定排最底）分組 + 待發佈標記 */
import { compareOrderThenId, type ChangeSummary } from '@903-player/catalog';
import type { LoadedEntry } from '../api/types';
import { t } from '../i18n/t';

export type CatalogItem = LoadedEntry;

export interface EntryGroups {
    /** 播放器顯示、可以拖曳排序（同 PUT /api/order 嘅 isListedEntry 一致） */
    listed: CatalogItem[];
    /** 掃描建立、未處理好嘅 draft 劇 */
    pending: CatalogItem[];
    unlisted: CatalogItem[];
}

export const isListed = (entry: CatalogItem): boolean =>
    entry.kind === 'shows'
        ? entry.definition.enabled !== false
        : !entry.draft && entry.definition.enabled === true;

const byOrder = (a: CatalogItem, b: CatalogItem) =>
    compareOrderThenId(
        {
            id: a.id,
            order: typeof a.definition.order === 'number' ? a.definition.order : undefined,
        },
        {
            id: b.id,
            order: typeof b.definition.order === 'number' ? b.definition.order : undefined,
        },
    );

/** 「已下架」分組分隔線：入面有從未上過架嘅（未上架）就寫「未上架 / 已下架」 */
export const unlistedLabelOf = (entries: readonly CatalogItem[]): string =>
    t(entries.some((e) => e.published === false) ? 'list.unlistedOrNever' : 'list.unlisted', {
        count: entries.length,
    });

export const groupEntries = (entries: readonly CatalogItem[]): EntryGroups => {
    const sorted = [...entries].sort(byOrder);
    return {
        listed: sorted.filter(isListed),
        pending: sorted.filter((e) => !isListed(e) && e.draft),
        unlisted: sorted.filter((e) => !isListed(e) && !e.draft),
    };
};

export interface ChangeFlags {
    /** 有已儲存、未發佈嘅改動：`${kind}:${id}` */
    pending: Set<string>;
    /** 從未發佈（新節目 / 新劇） */
    never: Set<string>;
    /** 從未發佈嘅短篇：`${dramaId}:${arcId}` */
    newArcs: Set<string>;
}

const NEW_ENTRY_KINDS: readonly string[] = ['newShow', 'newDrama'];

export const changeFlagsOf = (summary: ChangeSummary | undefined): ChangeFlags => {
    const flags: ChangeFlags = { pending: new Set(), never: new Set(), newArcs: new Set() };
    summary?.items.forEach((item) => {
        if (!item.entry) return;
        const key = `${item.entry.kind}:${item.entry.id}`;
        if (NEW_ENTRY_KINDS.includes(item.kind)) flags.never.add(key);
        else flags.pending.add(key);
        if (item.kind === 'newArc' && item.arc)
            flags.newArcs.add(`${item.entry.id}:${item.arc.id}`);
    });
    flags.never.forEach((key) => flags.pending.delete(key));
    return flags;
};
