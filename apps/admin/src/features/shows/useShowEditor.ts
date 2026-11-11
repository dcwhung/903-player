/* 節目編輯頁嘅狀態同動作：載入 / 新增（存完返列表）、儲存（新增要 ID）、改名、上載圖 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import { changeFlagsOf } from '../../model/listModel';
import { idProblem } from '../editor/IdField';
import { useEditorOrigin } from '../editor/useEditorOrigin';
import { useEntryEditor } from '../editor/useEntryEditor';
import { useImageSave } from '../editor/useImageSave';
import { useRenameEntry } from '../editor/useRenameEntry';
import { useToast } from '../../ui/Toast';
import { newShowDefinition } from './showModel';

/** 新節目第一次儲存成功 → toast + 返節目列表見到新嗰行（由待辦入嚟就交畀 afterSave 返待辦） */
const useBackToList = () => {
    const navigate = useNavigate();
    const toast = useToast();
    return (id: string) => {
        toast(t('editor.created', { id }));
        void navigate('/shows', { replace: true });
    };
};

export const useShowEditor = (id: string | undefined) => {
    const isNew = id === undefined;
    const [initial] = useState(() =>
        isNew ? { definition: newShowDefinition(), images: {} } : undefined,
    );
    const editor = useEntryEditor('shows', id ?? '', initial);
    const [newId, setNewId] = useState('');
    const origin = useEditorOrigin();
    const flags = changeFlagsOf(useAdminData().changes.data?.changes);
    const backToList = useBackToList();
    const save = async () => {
        if (!editor.draft || (isNew && idProblem(newId))) return;
        const saved = await editor.run(editor.draft, isNew ? newId : undefined);
        if (!saved) return;
        await origin.afterSave();
        if (isNew && !origin.fromTodos) backToList(saved.id);
    };
    return {
        isNew,
        editor,
        newId,
        setNewId,
        origin,
        save,
        neverPublished: isNew || flags.never.has(`shows:${id}`),
        saveImage: useImageSave(editor),
        rename: useRenameEntry(editor, origin.afterSave),
    };
};
