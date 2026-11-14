/*
 * 確認框每一行（一個欄位）：已發佈 vs 目前；上下架行淨係寫「恢復上架」。
 * 確認發佈頁時間線：edit 行 = detail.fields 逐個（認得、真係唔同先出）；unlist 行 = 一行「恢復上架」
 * （disabled → enabled、removedAt → removedAt、短篇刪咗 → '*'）；新內容、劇本身刪咗、少咗集數 = 冇還原
 */
import type { ChangeItem, UnlistReason } from '@903-player/catalog';
import type { LoadedEntry, RevertItem } from '../../api/types';
import { t } from '../../i18n/t';
import { fieldLabel } from '../update/changeFields';
import { revertValueOf, type RevertValue } from './revertValues';
import { arcByKey, fieldChanged, scopeOf, WHOLE_ARC, type RevertScope } from './revertScope';

export interface RevertRow {
    key: string;
    item: RevertItem;
    label: string;
    /** 冇 = 上下架行（「恢復上架」） */
    values?: { published: RevertValue; current: RevertValue };
}

/** 確認發佈頁一行可以還原嘅內容 */
export interface RevertTarget {
    entry: LoadedEntry;
    name: string;
    rows: RevertRow[];
}

const itemOf = (arc: string | undefined, field: string): RevertItem =>
    arc === undefined ? { field } : { arc, field };

export const rowOf = (scope: RevertScope, field: string): RevertRow => ({
    key: `${scope.arc ?? ''}:${field}`,
    item: itemOf(scope.arc, field),
    label: fieldLabel(field, scope.arc !== undefined),
    values: {
        published: revertValueOf(scope, scope.published, field),
        current: revertValueOf(scope, scope.current, field),
    },
});

export const relistRow = (arc: string | undefined, field: string): RevertRow => ({
    key: `${arc ?? ''}:${field}`,
    item: itemOf(arc, field),
    label: t('revert.relist'),
});

const UNLIST_FIELD: Readonly<Record<UnlistReason, string>> = {
    disabled: 'enabled',
    removedAt: 'removedAt',
    deleted: WHOLE_ARC,
};

const editRows = (item: ChangeItem, entry: LoadedEntry): RevertRow[] => {
    const scope = scopeOf(entry, item.arc?.id);
    if (!scope) return [];
    const fields = (item.detail.fields ?? []).filter((field) => fieldChanged(scope, field));
    return fields.map((field) => rowOf(scope, field));
};

const unlistRows = (item: ChangeItem, entry: LoadedEntry): RevertRow[] => {
    const { reason, episodes } = item.detail;
    const published = entry.publishedVersion;
    if (episodes || !reason || !published) return [];
    const field = UNLIST_FIELD[reason];
    const arc = item.arc?.id;
    if (arc === undefined) return field === WHOLE_ARC ? [] : [relistRow(undefined, field)];
    return arcByKey(published.definition, arc) ? [relistRow(arc, field)] : [];
};

/** 時間線一行 → 可以還原嘅內容；冇 = 唔出「還原」 */
export const timelineRevertOf = (
    item: ChangeItem,
    entries: readonly LoadedEntry[],
): RevertTarget | null => {
    const entry = entries.find((e) => e.kind === item.entry?.kind && e.id === item.entry.id);
    if (!entry) return null;
    const rows =
        item.kind === 'edit'
            ? editRows(item, entry)
            : item.kind === 'unlist'
              ? unlistRows(item, entry)
              : [];
    if (rows.length === 0) return null;
    return { entry, name: item.arc?.label ?? item.entry?.name ?? entry.id, rows };
};
