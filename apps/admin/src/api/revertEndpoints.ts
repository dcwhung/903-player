/* 還原未發佈改動（api 0.11.0）：POST /api/entries/:kind/:id/revert，要 If-Match；回應同 PUT 一樣 */
import { request } from './client';
import { entryPath } from './endpoints';
import type { EntryKind, RevertItem, SaveResult } from './types';

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
