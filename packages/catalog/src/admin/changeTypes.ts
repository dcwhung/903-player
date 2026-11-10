/* summarizeChanges 嘅型別（確認發佈時間線 + 上下架記錄共用） */
import type { CatalogDocument, CatalogKind } from '../document/document';

export type ChangeKind =
    'newShow' | 'newDrama' | 'newArc' | 'newEpisodes' | 'edit' | 'unlist' | 'rollback';

/** 'now' = 發佈即時生效；YYYY-MM-DD = 嗰日（香港時間）先生效 */
export type ChangeWhen = 'now' | string;

export interface ChangeEntryRef {
    kind: CatalogKind;
    id: string;
    name: string;
}

export interface ChangeArcRef {
    id: string;
    /** = R2 子資料夾名 */
    name: string;
    /** 顯示名（displayName ?? name） */
    label: string;
}

export type UnlistReason = 'disabled' | 'deleted' | 'removedAt';

export interface ChangeDetail {
    /** newArc / newEpisodes（短篇劇）：集數範圍 */
    episodes?: { first: number; last: number };
    /** newEpisodes（每日劇）：新日子 */
    dates?: string[];
    /** edit：改咗嘅欄位（頂層 key、`images`、`arcs.<arc id>.<key>`） */
    fields?: string[];
    /** unlist：點解落架 */
    reason?: UnlistReason;
    /** rollback：還原自邊次 publish */
    publishId?: number;
}

export interface ChangeItem {
    kind: ChangeKind;
    when: ChangeWhen;
    /** rollback 冇 */
    entry?: ChangeEntryRef;
    arc?: ChangeArcRef;
    detail: ChangeDetail;
}

export interface ChangeTimelineGroup {
    when: ChangeWhen;
    items: ChangeItem[];
}

export interface ChangeSummary {
    items: ChangeItem[];
    /** 'now' 先，之後日子由早到遲 */
    timeline: ChangeTimelineGroup[];
}

/** 比較用嘅 document（catalog.json 或者 documentFromEntries 結果；definition 未驗證） */
export type ChangeDocument = Pick<CatalogDocument, 'shows' | 'dramas'>;

export interface SummarizeOptions {
    /** 呢次 publish 係還原自邊次（publishes.rollback_of） */
    rollbackOf?: number | null;
}
