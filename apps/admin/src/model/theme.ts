/*
 * Entry 嘅配色（definition.theme）：讀法、「未設定」（= NEUTRAL_THEME 10 色，同 api neutralTheme 警告一樣）、
 * 細版 player 預覽用嘅 --theme-* custom property（跟 apps/player tokens 命名）
 */
import { NEUTRAL_THEME, type ShowTheme } from '@903-player/catalog';
import type { CSSProperties } from 'react';
import type { RawDefinition } from '../api/types';
import { isRecord } from './raw';

/** definition.theme（ShowTheme 減 art，art 係 player runtime 先補） */
export type EntryTheme = Omit<ShowTheme, 'art'>;

/** 必填 10 色（同 packages/catalog themeSchema COLOUR_KEYS） */
export const THEME_COLOUR_KEYS = [
    'bg',
    'surface',
    'track',
    'accent',
    'onAccent',
    'title',
    'text',
    'muted',
    'shadowDark',
    'shadowLight',
] as const;

const OPTIONAL_KEYS = ['scheme', 'statusBar', 'accentText', 'titleFont', 'headerRule'] as const;

const NEUTRAL_COLOURS: Record<string, string> = Object.fromEntries(
    THEME_COLOUR_KEYS.map((key) => [key, NEUTRAL_THEME[key]]),
);

/** 冇 theme（或者欠色）就用中性灰補 */
export const themeOf = (definition: RawDefinition): EntryTheme => {
    const raw = isRecord(definition.theme) ? definition.theme : {};
    const theme: Record<string, string> = { ...NEUTRAL_COLOURS };
    [...THEME_COLOUR_KEYS, ...OPTIONAL_KEYS].forEach((key) => {
        if (typeof raw[key] === 'string') theme[key] = raw[key];
    });
    return theme as unknown as EntryTheme;
};

/** 10 色同 NEUTRAL_THEME 一樣（唔分大細楷）= 未設定配色 */
export const isNeutralTheme = (theme: Pick<ShowTheme, (typeof THEME_COLOUR_KEYS)[number]>) =>
    THEME_COLOUR_KEYS.every((key) => theme[key].toLowerCase() === NEUTRAL_THEME[key].toLowerCase());

/** 冇設嘅選填欄位：狀態列透明、頁頭冇裝飾線 */
const NO_STATUS_BAR = 'transparent';
const NO_HEADER_RULE = 'none';

/** 細版 player 預覽（裁切 dialog、配色候選卡）嘅 CSS custom property */
export const themeStyle = (theme: EntryTheme): CSSProperties =>
    ({
        '--theme-bg': theme.bg,
        '--theme-surface': theme.surface,
        '--theme-track': theme.track,
        '--theme-accent': theme.accent,
        '--theme-on-accent': theme.onAccent,
        '--theme-title': theme.title,
        '--theme-text': theme.text,
        '--theme-muted': theme.muted,
        '--theme-shadow-dark': theme.shadowDark,
        '--theme-shadow-light': theme.shadowLight,
        '--theme-accent-text': theme.accentText ?? theme.accent,
        '--theme-status-bar': theme.statusBar ?? NO_STATUS_BAR,
        '--theme-header-rule': theme.headerRule ?? NO_HEADER_RULE,
        ...(theme.titleFont ? { '--theme-title-font': theme.titleFont } : {}),
    }) as CSSProperties;

/** 裁切 dialog 播放器預覽：名 + 配色（短篇用劇集嘅配色） */
export const previewInfoOf = (themed: RawDefinition, name: string) => ({
    name,
    theme: themeOf(themed),
});
