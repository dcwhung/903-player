/*
 * 還原未發佈改動（api 0.11.0）：POST /api/entries/:kind/:id/revert，要 If-Match；回應同 PUT 一樣。
 * 排序（api 0.12.0，#6）：POST /api/order/:kind/revert，成個列表還原返最新發佈嘅次序（冇 body / If-Match）
 */
import { request } from './client';
import { entryPath } from './endpoints';
import type { EntryKind, LoadedEntry, RevertItem, SaveResult } from './types';

export const revertEntry = (
    kind: EntryKind,
    id: string,
    items: readonly RevertItem[],
    etag: string | null,
) =>
    request<SaveResult>(`${entryPath(kind, id)}/revert`, {
        method: 'POST',
        body: { items },
        ifMatch: etag,
    });

/** 確認框用：還原呢個 entry 剔咗嘅項目 */
export const entryReverter = (entry: LoadedEntry) => (items: readonly RevertItem[]) =>
    revertEntry(entry.kind, entry.id, items, entry.etag);

/** 200 { updated }：真係改咗嘅 entry 數；409 notPublished = 從未發佈 */
export const revertOrder = (kind: EntryKind) =>
    request<{ updated: number }>(`/api/order/${kind}/revert`, { method: 'POST' });
