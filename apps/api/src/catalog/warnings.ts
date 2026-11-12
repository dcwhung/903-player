/*
 * Publish 警告（唔阻 publish，admin 確認發佈頁列出）：
 * - contrast：theme 色對唔夠 WCAG AA（packages/catalog checkThemeContrast）
 * - neutralTheme：theme 10 個必填色同 NEUTRAL_THEME 一樣 =「未設定配色」（唔理 art 同選填欄位）
 */
import {
    checkThemeContrast,
    NEUTRAL_THEME,
    type CatalogDocument,
    type CatalogKind,
    type ContrastTheme,
    type ContrastWarning,
} from '@903-player/catalog';

export type PublishWarning =
    | ({ kind: 'contrast'; target: string } & ContrastWarning)
    | { kind: 'neutralTheme'; target: string };

/** ShowTheme 嘅必填色（art 係圖，唔係色；themeSchema COLOUR_KEYS 一樣） */
const NEUTRAL_COLOUR_KEYS = [
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

const KINDS: readonly CatalogKind[] = ['shows', 'dramas'];

type ThemeColours = Record<string, unknown>;

const themeOf = (definition: Readonly<Record<string, unknown>>): ThemeColours | undefined => {
    const theme = definition.theme;
    return typeof theme === 'object' && theme !== null && !Array.isArray(theme)
        ? (theme as ThemeColours)
        : undefined;
};

/** 色值唔分大細楷（#F2F2F2 同 #f2f2f2 一樣） */
const sameColour = (a: unknown, b: string) => typeof a === 'string' && a.toLowerCase() === b;

export const isNeutralTheme = (theme: ThemeColours): boolean =>
    NEUTRAL_COLOUR_KEYS.every((key) => sameColour(theme[key], NEUTRAL_THEME[key]));

const warningsOf = (target: string, theme: ThemeColours): PublishWarning[] => [
    ...(isNeutralTheme(theme) ? [{ kind: 'neutralTheme' as const, target }] : []),
    ...checkThemeContrast(theme as unknown as ContrastTheme).map((warning) => ({
        kind: 'contrast' as const,
        target,
        ...warning,
    })),
];

/** 驗過嘅 document 每項 theme 嘅警告（次序 = 節目先、劇集後，各自按 document 次序） */
export const publishWarnings = (doc: CatalogDocument): PublishWarning[] =>
    KINDS.flatMap((kind) =>
        doc[kind].flatMap((entry) => {
            const theme = themeOf(entry.definition);
            return theme ? warningsOf(`${kind}/${entry.id}`, theme) : [];
        }),
    );
