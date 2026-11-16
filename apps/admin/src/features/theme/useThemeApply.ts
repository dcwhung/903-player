/*
 * 套用配色 = 喺最新已儲存版本改 definition.theme 即刻 PUT（同圖片上載即存一樣，唔連其他未儲存改動）。
 * 存到之後重讀未發佈變更：nav「更新」待發佈數 / 處理待辦「已修改」即刻計埋配色（同 App 外觀卡一樣唔等）
 */
import { useAdminData } from '../../data/AdminData';
import type { EntryTheme } from '../../model/theme';
import type { EntryEditor } from '../editor/useEntryEditor';

export const useThemeApply = (editor: EntryEditor) => {
    const { changes } = useAdminData();
    return async (theme: EntryTheme): Promise<boolean> => {
        const saved = await editor.patchSaved((draft) => ({
            ...draft,
            definition: { ...draft.definition, theme },
        }));
        if (saved) void changes.reload();
        return saved;
    };
};
