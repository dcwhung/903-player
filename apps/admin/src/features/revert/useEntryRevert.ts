/*
 * 編輯頁還原（mockup admin-revert ③）：已儲存版本 vs 發佈版本；有未儲存改動（dirtyKeys）唔准還原（blocked = 原因）。
 * 還原完重讀 entry + admin 資料（時間線 / 待辦 / 列表）
 */
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import type { EntryEditor } from '../editor/useEntryEditor';
import { scopeOf, type RevertScope } from './revertScope';
import type { LoadedEntry } from '../../api/types';

export interface EntryRevert {
    entry: LoadedEntry | null;
    scope: RevertScope | null;
    blocked: string | undefined;
    onDone: () => Promise<unknown>;
}

/** arc = 短篇 key（catalog arcIdOf）；冇 = entry 頂層 */
export const useEntryRevert = (editor: EntryEditor, arc?: string): EntryRevert => {
    const { refresh } = useAdminData();
    return {
        entry: editor.entry,
        scope: scopeOf(editor.entry, arc),
        blocked: editor.dirtyKeys.length > 0 ? t('revert.dirtyTip') : undefined,
        onDone: () => Promise.all([editor.reload(), refresh()]),
    };
};
