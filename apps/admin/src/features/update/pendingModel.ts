/*
 * 待發佈項目（nav「更新」數字 + 處理待辦頁「其他改動」section 共用）：
 * 新內容待辦行 + 其他已儲存改動（修改 / 下架 / 排序……，即確認發佈頁一定一併發佈嘅行，每項一個）+ 有改動嘅 App 外觀項目
 */
import type { ChangeItem } from '@903-player/catalog';
import type { ChangesResponse, TodoRow } from '../../api/types';
import { changedAppearance } from './selectionModel';

/** 其他已儲存改動（others，一定一併發佈）全部類型；未載入 / 舊 API = 冇 */
export const pendingOthers = (changes: ChangesResponse | undefined): readonly ChangeItem[] =>
    changes?.others?.items ?? [];

export const pendingPublishCount = (
    rows: readonly TodoRow[],
    changes: ChangesResponse | undefined,
): number =>
    rows.length + pendingOthers(changes).length + changedAppearance(changes?.appearance).length;
