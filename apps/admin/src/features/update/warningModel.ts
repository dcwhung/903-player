/*
 * 發佈警告（api 0.8.0 warnings，唔阻發佈）→ 清單每行：文字、範圍（廣播劇 / 節目 · 配色）、「前往修改 / 前往選擇」連結
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#f（.issues.warn）
 */
import type { EntryKind, LoadedEntry, PublishWarning } from '../../api/types';
import { t } from '../../i18n/t';
import { dramaEditorPath, showEditorPath } from '../../model/paths';
import { nameOf } from '../../model/raw';

export interface WarningRow {
    key: string;
    text: string;
    scope: string;
    href: string;
    action: string;
}

const KINDS: readonly EntryKind[] = ['shows', 'dramas'];
/** 比例顯示一個小數位、向下捨（4.47 唔會變 4.5 扮合格） */
const RATIO_DECIMALS = 10;

const targetOf = (target: string): { kind: EntryKind; id: string } | null => {
    const [kind, id, ...rest] = target.split('/');
    const known = KINDS.find((k) => k === kind);
    return known && id && rest.length === 0 ? { kind: known, id } : null;
};

const ratioText = (ratio: number) =>
    (Math.floor(ratio * RATIO_DECIMALS) / RATIO_DECIMALS).toFixed(1);

const textOf = (warning: PublishWarning, name: string) => {
    if (warning.kind === 'neutralTheme') return t('publish.warnNeutral', { name });
    const pair = { name, fg: warning.foreground, bg: warning.background, min: warning.minimum };
    return warning.ratio === null
        ? t('publish.warnUnreadable', pair)
        : t('publish.warnContrast', { ...pair, ratio: ratioText(warning.ratio) });
};

const hrefOf = (kind: EntryKind, id: string) =>
    `${kind === 'dramas' ? dramaEditorPath(id) : showEditorPath(id)}/theme`;

export const warningRows = (
    warnings: readonly PublishWarning[],
    entries: readonly LoadedEntry[],
): WarningRow[] =>
    warnings.flatMap((warning) => {
        const target = targetOf(warning.target);
        if (!target) return [];
        const entry = entries.find((e) => e.kind === target.kind && e.id === target.id);
        const name = entry ? nameOf(entry.definition, target.id) : target.id;
        const suffix =
            warning.kind === 'contrast' ? `:${warning.foreground}:${warning.background}` : '';
        return [
            {
                key: `${warning.target}${suffix}`,
                text: textOf(warning, name),
                scope: t(target.kind === 'dramas' ? 'publish.scopeDrama' : 'publish.scopeShow'),
                href: hrefOf(target.kind, target.id),
                action: t(warning.kind === 'contrast' ? 'publish.fixLink' : 'publish.pickLink'),
            },
        ];
    });
