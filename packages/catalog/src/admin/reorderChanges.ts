/*
 * 排序改動（#6 決定 A）：拖曳排序會寫晒上架 entry 嘅 definition.order，逐個報「修改 · 排序」又逐個還原會撞次序，
 * 所以當整體改動：前後都上架嘅 entry 相對次序（同 player 一樣：compareOrderThenId）唔同 → 每個列表一個 reorder item。
 * 新加 / 拎走 / 落架嘅 entry 唔計（有自己嘅 item）；淨係重新編號、相對次序冇變唔報；第一次發佈唔報
 */
import { compareOrderThenId } from '../core/ordering';
import type { CatalogEntry, CatalogKind } from '../document/document';
import type { ChangeDocument, ChangeItem } from './changeTypes';
import { isEntryListed } from './rawDefinition';

const KINDS = ['shows', 'dramas'] as const satisfies readonly CatalogKind[];

/** 上架 entry 按 player 主頁次序嘅 id（order 唔係數字當冇寫） */
const listedIds = (kind: CatalogKind, entries: readonly CatalogEntry[]): string[] =>
    entries
        .filter((entry) => isEntryListed(kind, entry.definition))
        .map(({ id, definition }) => ({
            id,
            order: typeof definition.order === 'number' ? definition.order : undefined,
        }))
        .sort(compareOrderThenId)
        .map(({ id }) => id);

const relativeOrderChanged = (before: readonly string[], after: readonly string[]): boolean => {
    const common = new Set(before.filter((id) => after.includes(id)));
    const a = before.filter((id) => common.has(id));
    const b = after.filter((id) => common.has(id));
    return a.some((id, i) => id !== b[i]);
};

/** prev = null（第一次發佈）→ 冇 */
export const reorderItems = (prev: ChangeDocument | null, next: ChangeDocument): ChangeItem[] =>
    prev === null
        ? []
        : KINDS.filter((kind) =>
              relativeOrderChanged(listedIds(kind, prev[kind]), listedIds(kind, next[kind])),
          ).map((list): ChangeItem => ({ kind: 'reorder', when: 'now', detail: { list } }));
