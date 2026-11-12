/*
 * 節目 · 配色（編輯卡下面一格）：Design Origin: mockup: _mockups_/admin-phase4/index.html#d
 * 由已儲存嘅碟面抽色；套用即存（新節目未儲存就淨係改草稿，跟埋「儲存」先寫）
 */
import { t } from '../../i18n/t';
import { imageOf } from '../../model/raw';
import { themeOf } from '../../model/theme';
import { ThemeEditor } from '../theme/ThemeEditor';
import { useThemeApply } from '../theme/useThemeApply';
import type { ShowEditorState } from './useShowEditor';

export function ShowThemeCard({ show, name }: { show: ShowEditorState; name: string }) {
    const { editor } = show;
    const apply = useThemeApply(editor);
    const saved = editor.entry;
    return (
        <ThemeEditor
            name={name}
            sub={t('themeEditor.showSub')}
            discUrl={saved ? imageOf(saved.definition, saved.images, 'disc') : undefined}
            current={themeOf(saved?.definition ?? editor.draft?.definition ?? {})}
            onApply={apply}
        />
    );
}
