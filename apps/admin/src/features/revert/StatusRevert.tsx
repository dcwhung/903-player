/*
 * 狀態欄（上架 toggle）嘅還原：上下架 = enabled + 下架日期 removedAt（編輯頁冇下架日期欄位，
 * 所以兩個都喺「狀態」度還原，確認框逐個剔）
 */
import { PublishedHint } from './FieldRevert';
import type { EntryRevert } from './useEntryRevert';

export const STATUS_FIELDS = ['enabled', 'removedAt'] as const;

export function StatusHint({ revert }: { revert: EntryRevert | undefined }) {
    return revert ? <PublishedHint revert={revert} fields={STATUS_FIELDS} /> : null;
}
