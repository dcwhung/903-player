/* 標題雙擊改名：Enter 即存（用已儲存版本 + 新名 PUT，同步落草稿） */
import type { EntryEditor } from './useEntryEditor';

export const useRenameEntry =
    (editor: EntryEditor, afterSave: () => Promise<void>) => async (name: string) => {
        const { entry, run, setDefinition } = editor;
        if (!entry) return setDefinition((d) => ({ ...d, name }));
        const saved = await run({
            definition: { ...entry.definition, name },
            images: entry.images,
        });
        if (!saved) return;
        setDefinition((d) => ({ ...d, name }));
        await afterSave();
    };
