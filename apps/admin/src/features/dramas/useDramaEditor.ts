/* 廣播劇編輯頁（三個 tab 共用）：載入、儲存（未發佈可改 ID）、改名、上載圖、重新掃描、欄位錯誤 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminData } from '../../data/AdminData';
import { changeFlagsOf } from '../../model/listModel';
import { idProblem } from '../editor/IdField';
import { useEditorOrigin } from '../editor/useEditorOrigin';
import { useEntryEditor, type EntryEditor } from '../editor/useEntryEditor';
import { useImageSave } from '../editor/useImageSave';
import { useRenameEntry } from '../editor/useRenameEntry';
import { PLACEHOLDER_ID } from './dramaModel';
import { useRescan } from './useRescan';

/** 改 ID 之後：同一個 tab / query 換新 ID */
const renamedPath = (pathname: string, search: string, from: string, to: string) =>
    `${pathname.replace(`/dramas/${from}`, `/dramas/${to}`)}${search}`;

/** 從未發佈（可改 ID / 類型 / 刪除）、資料夾唔見咗 */
const useDramaFlags = (id: string, editor: EntryEditor) => {
    const { changes, todos } = useAdminData();
    const flags = changeFlagsOf(changes.data?.changes);
    const never = flags.never.has(`dramas:${id}`);
    const rows = todos.data?.rows ?? [];
    return {
        neverPublished: editor.entry?.draft === true || never,
        pendingPublish: flags.pending.has(`dramas:${id}`),
        /** 從未發佈嘅短篇（新短篇 / placeholder ID）：ID 仲改得 */
        isNewArc: (arcId: string) =>
            never || flags.newArcs.has(`${id}:${arcId}`) || PLACEHOLDER_ID.test(arcId),
        missingFolder: rows.some((r) => r.kind === 'missingFolder' && r.dramaId === id),
    };
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
    const save = async () => {
        if (!editor.draft || errors.errorCount > 0) return;
        const saved = await editor.run(editor.draft, newId !== id ? newId : undefined);
        if (!saved) return;
        if (saved.id !== id && !origin.fromTodos)
            navigate(renamedPath(pathname, search, id, saved.id), { replace: true });
        await origin.afterSave();
    };
    const parts = { id, editor, origin, newId, setNewId, save, ...errors };
    return {
        ...parts,
        ...useDramaFlags(id, editor),
        saveImage: useImageSave(editor),
        rename: useRenameEntry(editor, origin.afterSave),
        rescan: useRescan(id, editor),
    };
};

export type DramaEditorState = ReturnType<typeof useDramaEditor>;
