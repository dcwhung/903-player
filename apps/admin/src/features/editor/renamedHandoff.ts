/*
 * 改劇集 ID 成功、之後 PUT 失敗（AU-013）：editor 要搬去新 ID 嘅 URL，但編輯頁以 ID 做 key，
 * 換 URL 會成個重新 mount、由 server 重新載入，草稿同錯誤提示會冇晒。
 * 所以搬之前將「server 而家嘅版本 + 草稿 + 錯誤」暫存喺度，新 ID 嗰頁 mount 時接手（唔再 GET）。
 * 只存喺記憶體、只得一格：重新整理 / 去第二頁就照常由 server 載入
 */
import type { EntryKind, LoadedEntry } from '../../api/types';
import type { Draft, Problem } from './entryDraft';

export interface RenamedHandoff {
    entry: LoadedEntry;
    draft: Draft;
    problem: Problem;
}

let pending: RenamedHandoff | null = null;

export const stashRenamedHandoff = (handoff: RenamedHandoff) => {
    pending = handoff;
};

/** 畀 (kind, id) 嗰頁嘅暫存；唔啱就 null。唔清走（StrictMode 會 init 兩次），mount 完先 drop */
export const renamedHandoffFor = (kind: EntryKind, id: string): RenamedHandoff | null =>
    pending?.entry.kind === kind && pending.entry.id === id ? pending : null;

export const dropRenamedHandoff = (handoff: RenamedHandoff | null) => {
    if (handoff !== null && pending === handoff) pending = null;
};
