/*
 * 廣播劇 · 配色：Design Origin: mockup: _mockups_/admin-phase4/index.html#d
 * 由已儲存嘅碟面抽色；套用即存（useThemeApply）
 */
import { t } from '../../i18n/t';
import { imageOf, nameOf, totalEpisodes } from '../../model/raw';
import { themeOf } from '../../model/theme';
import { ThemeEditor } from '../theme/ThemeEditor';
import { useThemeApply } from '../theme/useThemeApply';
import type { DramaEditorState } from './useDramaEditor';

export function DramaThemeTab({ state }: { state: DramaEditorState }) {
    const { editor } = state;
    const apply = useThemeApply(editor);
    const definition = editor.draft?.definition ?? {};
    const saved = editor.entry;
    return (
        <ThemeEditor
            name={nameOf(definition, state.id)}
            sub={t('themeEditor.dramaSub', { count: totalEpisodes(definition) })}
            discUrl={saved ? imageOf(saved.definition, saved.images, 'disc') : undefined}
            current={themeOf(saved?.definition ?? definition)}
            onApply={apply}
        />
    );
}
