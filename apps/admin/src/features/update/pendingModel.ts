/*
 * 待發佈項目（nav「更新」數字 + 處理待辦頁「已修改」section 共用）：
 * 新內容待辦行 + 已修改項目（基本資料 / 配色，即確認發佈頁嘅「修改」行，每項一個）+ 有改動嘅 App 外觀項目
 */
import type { ChangeItem, ChangeKind } from '@903-player/catalog';
import type { ChangesResponse, TodoRow } from '../../api/types';
import { changedAppearance } from './selectionModel';

const EDIT_KIND: ChangeKind = 'edit';

/** 其他已儲存改動（others，一定一併發佈）入面嘅「修改」；未載入 / 舊 API = 冇 */
export const pendingEdits = (changes: ChangesResponse | undefined): ChangeItem[] =>
    (changes?.others?.items ?? []).filter((item) => item.kind === EDIT_KIND);

export const pendingPublishCount = (
    rows: readonly TodoRow[],
    changes: ChangesResponse | undefined,
): number =>
    rows.length + pendingEdits(changes).length + changedAppearance(changes?.appearance).length;
