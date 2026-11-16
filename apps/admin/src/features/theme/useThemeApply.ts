/* 套用配色 = 喺最新已儲存版本改 definition.theme 即刻 PUT（同圖片上載即存一樣，唔連其他未儲存改動） */
import type { EntryTheme } from '../../model/theme';
import type { EntryEditor } from '../editor/useEntryEditor';

export const useThemeApply = (editor: EntryEditor) => (theme: EntryTheme) =>
    editor.patchSaved((draft) => ({ ...draft, definition: { ...draft.definition, theme } }));
