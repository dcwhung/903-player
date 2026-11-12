/*
 * 廣播劇編輯頁（三個 tab 共用）：載入、儲存（未發佈可改 ID；確認自動派嘅 ID）、改名、上載圖、重新掃描、欄位錯誤
 */
import { useState } from 'react';
import { errorMessage } from '../../api/errorMessage';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminData } from '../../data/AdminData';
import { useToast } from '../../ui/Toast';
import { changeFlagsOf } from '../../model/listModel';
import { renamedDramaPath } from '../../model/paths';
import { arcPublishedIn } from '../../model/raw';
import { idProblem } from '../editor/IdField';
import { useEditorOrigin } from '../editor/useEditorOrigin';
import { useEntryEditor, type EntryEditor } from '../editor/useEntryEditor';
import { useImageSave } from '../editor/useImageSave';
import { useRenameEntry } from '../editor/useRenameEntry';
import { PLACEHOLDER_ID } from './dramaModel';
import { useR2AutoCrop } from './useR2AutoCrop';
import { useRescan } from './useRescan';
import { confirmAll, useUnconfirmedIds, type IdConfirm } from './idConfirm';

/** 從未發佈（可改 ID / 類型 / 刪除）、資料夾唔見咗、短篇有冇上過架（未上架 / 已下架） */
const useDramaFlags = (id: string, editor: EntryEditor) => {
    const { changes, todos, entries } = useAdminData();
    const flags = changeFlagsOf(changes.data?.changes);
    const summary = entries.data?.find((e) => e.kind === 'dramas' && e.id === id);
    const never = flags.never.has(`dramas:${id}`);
    const rows = todos.data?.rows ?? [];
    return {
        neverPublished: editor.entry?.draft === true || never,
        pendingPublish: flags.pending.has(`dramas:${id}`),
        /** 從未發佈嘅短篇（新短篇 / placeholder ID）：ID 仲改得 */
        isNewArc: (arcId: string) =>
            never || flags.newArcs.has(`${id}:${arcId}`) || PLACEHOLDER_ID.test(arcId),
        /** undefined = 未知（列表未載入 / 舊 API）→ 照舊當上過架 */
        isArcPublished: (arcId: string) => arcPublishedIn(summary?.publishedArcs, arcId),
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

export const useDramaEditor = (id: string) => {
    const editor = useEntryEditor('dramas', id);
    const origin = useEditorOrigin();
    const { pathname, search } = useLocation();
    const navigate = useNavigate();
    const [newId, setNewId] = useState(id);
    const errors = useFieldErrors(newId);
    const toast = useToast();
    const save = async (confirm: IdConfirm = {}) => {
        if (!editor.draft || errors.errorCount > 0) return;
        const saved = await persistDraft(editor, newId !== id ? newId : undefined);
        if (!saved) return;
        await confirmAll(saved.id, confirm).catch((error: unknown) => toast(errorMessage(error)));
        if (saved.id !== id && !origin.fromTodos)
            navigate(`${renamedDramaPath(pathname, id, saved.id)}${search}`, { replace: true });
        await origin.afterSave();
    };
    const parts = { id, editor, origin, newId, setNewId, save, ...errors };
    const autoCrop = useR2AutoCrop(id, editor);
    return {
        ...parts,
        ...useDramaFlags(id, editor),
        ...useUnconfirmedIds(id),
        saveImage: useImageSave(editor),
        rename: useRenameEntry(editor, origin.afterSave),
        rescan: useRescan(id, editor, autoCrop.run),
        autoCrop,
    };
};

export type DramaEditorState = ReturnType<typeof useDramaEditor>;
