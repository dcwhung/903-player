/*
 * 廣播劇編輯頁（三個 tab 共用）：載入、儲存（未發佈可改 ID；確認自動派嘅 ID）、改名、上載圖、重新掃描、欄位錯誤。
 * 改 ID：server 連自動編號嘅短篇 ID（<舊 ID>-NN）一齊改，URL（包括記住嘅 #短篇）同要確認嘅短篇 ID 跟住改；
 * rename 成功但 PUT 失敗都要搬去新 ID（草稿 + 錯誤由 editor/renamedHandoff 帶過去，AU-013）；
 * unsaved = 有未儲存嘅嘢，離開要問（editor/LeaveGuard，AU-023）
 */
import { useState } from 'react';
import { errorMessage } from '../../api/errorMessage';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminData } from '../../data/AdminData';
import { useToast } from '../../ui/Toast';
import { changeFlagsOf } from '../../model/listModel';
import { arcPublishedIn } from '../../model/raw';
import { idProblem } from '../editor/IdField';
import { ownNavigation } from '../editor/leaveRules';
import { useEditorOrigin } from '../editor/useEditorOrigin';
import { useEntryEditor, type EntryEditor } from '../editor/useEntryEditor';
import { useImageSave } from '../editor/useImageSave';
import { useRenameEntry } from '../editor/useRenameEntry';
import { PLACEHOLDER_ID } from './dramaModel';
import { renamedDramaUrl } from './renamedUrl';
import { useR2AutoCrop } from './useR2AutoCrop';
import { useRescan } from './useRescan';
import { confirmAll, renamedConfirm, useUnconfirmedIds, type IdConfirm } from './idConfirm';

/** 從未發佈（可改 ID / 類型 / 刪除）、資料夾唔見咗、短篇有冇上過架（未上架 / 已下架） */
const useDramaFlags = (id: string, editor: EntryEditor) => {
    const { changes, todos, entries } = useAdminData();
    const flags = changeFlagsOf(changes.data?.changes);
    const summary = entries.data?.find((e) => e.kind === 'dramas' && e.id === id);
    const never = flags.never.has(`dramas:${id}`);
    const rows = todos.data?.rows ?? [];
    const neverPublished = editor.entry?.draft === true || never;
    /** 從未發佈嘅短篇（新短篇 / placeholder ID）：ID 仲改得 */
    const isNewArc = (arcId: string) =>
        never || flags.newArcs.has(`${id}:${arcId}`) || PLACEHOLDER_ID.test(arcId);
    /** undefined = 未知（列表未載入 / 舊 API）→ 照舊當上過架 */
    const isArcPublished = (arcId: string) => arcPublishedIn(summary?.publishedArcs, arcId);
    return {
        neverPublished,
        pendingPublish: flags.pending.has(`dramas:${id}`),
        isNewArc,
        isArcPublished,
        /**
         * 短篇喺唔喺已發佈 catalog（排程：唔喺就冇集數算已上架，見 stripModel.scheduleContextOf）：
         * 劇集未發佈 / 新短篇 / 明確從未上過架；唔知（undefined）就當喺
         */
        isArcLive: (arcId: string) =>
            !neverPublished && !isNewArc(arcId) && isArcPublished(arcId) !== false,
        missingFolder: rows.some((r) => r.kind === 'missingFolder' && r.dramaId === id),
    };
};

/** 冇改動又冇改 ID：唔使 PUT（淨係確認 ID） */
const persistDraft = (editor: EntryEditor, renameTo: string | undefined) => {
    if (!editor.draft) return Promise.resolve(null);
    if (editor.dirtyKeys.length === 0 && !renameTo && editor.entry)
        return Promise.resolve(editor.entry);
    return editor.run(editor.draft, renameTo);
};

/** 欄位錯誤（各集標題、ID）：有錯唔准儲存 */
const useFieldErrors = (newId: string) => {
    const [fieldErrors, setFieldErrors] = useState<Record<string, number>>({});
    const setFieldError = (key: string, count: number) =>
        setFieldErrors((errors) => (errors[key] === count ? errors : { ...errors, [key]: count }));
    const total = Object.values(fieldErrors).reduce((a, b) => a + b, 0);
    return { errorCount: total + (idProblem(newId) ? 1 : 0), setFieldError };
};

/** 改咗 ID：同一個 tab 換去新 ID 嘅 URL（S-857），記住嘅短篇同待辦 ?todo= 跟住改（renamedUrl） */
const useFollowRename = (id: string) => {
    const location = useLocation();
    const navigate = useNavigate();
    const rows = useAdminData().todos.data?.rows ?? [];
    // 編輯頁自己搬（ownNavigation）：就算草稿仲有未儲存改動（PUT 失敗）都唔問，草稿跟住去新 ID
    return (to: string) =>
        navigate(renamedDramaUrl(location, rows, id, to), ownNavigation({ replace: true }));
};

interface DramaSaveInput {
    id: string;
    editor: EntryEditor;
    origin: ReturnType<typeof useEditorOrigin>;
    /** 同 id 唔同 = 連 ID 一齊改 */
    newId: string;
    errorCount: number;
}

/** 儲存：有欄位錯誤唔存；（改 ID →）PUT → 確認自動派嘅 ID → 改咗 ID 就換 URL → 刷新 / 返待辦 */
const useDramaSave = ({ id, editor, origin, newId, errorCount }: DramaSaveInput) => {
    const { refresh } = useAdminData();
    const followRename = useFollowRename(id);
    const toast = useToast();
    /** rename 成功但 PUT 失敗：server 已經喺新 ID → 搬過去（草稿 + 錯誤跟住去），列表 / 待辦重新攞 */
    const followFailedSave = async () => {
        const movedTo = editor.savedId();
        if (movedTo === undefined || movedTo === id) return;
        await followRename(movedTo);
        await refresh();
    };
    return async (confirm: IdConfirm = {}) => {
        if (!editor.draft || errorCount > 0) return;
        const saved = await persistDraft(editor, newId !== id ? newId : undefined);
        if (!saved) return followFailedSave();
        await confirmAll(saved.id, renamedConfirm(confirm, id, saved.id)).catch((error: unknown) =>
            toast(errorMessage(error)),
        );
        if (saved.id !== id && !origin.fromTodos) await followRename(saved.id);
        await origin.afterSave({ draftSaved: true });
    };
};

export const useDramaEditor = (id: string) => {
    const editor = useEntryEditor('dramas', id);
    const origin = useEditorOrigin();
    const [newId, setNewId] = useState(id);
    const errors = useFieldErrors(newId);
    const save = useDramaSave({ id, editor, origin, newId, errorCount: errors.errorCount });
    /** 離開會冇咗嘅嘢：草稿改動 / 未儲存嘅改 ID（LeaveGuard，AU-023） */
    const unsaved = editor.dirtyKeys.length > 0 || newId !== id;
    const parts = { id, editor, origin, newId, setNewId, save, unsaved, ...errors };
    const autoCrop = useR2AutoCrop(id, editor);
    return {
        ...parts,
        ...useDramaFlags(id, editor),
        ...useUnconfirmedIds(id),
        saveImage: useImageSave(editor),
        rename: useRenameEntry(editor, origin.afterSave),
        rescan: useRescan(id, editor, autoCrop.retry),
        autoCrop,
    };
};

export type DramaEditorState = ReturnType<typeof useDramaEditor>;
