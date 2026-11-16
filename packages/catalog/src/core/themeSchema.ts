/* JSON 入面嘅色調（ShowTheme 減圖；圖由 folder 入面嘅檔補上） */
import type { ShowTheme } from '../showTheme';
import {
    fail,
    readHex,
    readOptionalEnum,
    readOptionalString,
    readRecord,
    type ParseContext,
    type Raw,
} from './reader';

export type ThemeDefinition = Omit<ShowTheme, 'art'>;

/** ShowTheme 必填 10 色（art 係圖，唔係色）；admin 等用家經 public API 共用呢份清單（S-916） */
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
const OPTIONAL_COLOUR_KEYS = ['statusBar', 'accentText'] as const;
const SCHEMES = ['light'] as const;

/*
 * W-702：headerRule / titleFont 原封不動入 CSS custom property（劇集頁頁頭 background / font-family），
 * 而家可以嚟自 remote catalog.json，所以用白名單：唔准 url() / image-set() 等攞資源嘅 function、
 * CSS escape（\）、引號、: ; 同 //。JSON Schema（drama / show）用同一條 pattern，
 * jsonSchemas.node.test.ts 鎖住兩邊一樣。ECMAScript 'u' flag（ajv 預設都係），冇 i flag（function / 關鍵字只收細楷）
 */
/** headerRule 准用嘅 CSS function（後面一定要即刻跟 `(`） */
const HEADER_RULE_FUNCTIONS =
    '(?:repeating-linear-gradient|linear-gradient|radial-gradient|calc)\\(';
/** 關鍵字（to、circle、no-repeat、transparent…）：後面唔准跟 `(`，即係唔可以變 function */
const CSS_KEYWORD = '[a-z]+(?:-[a-z]+)*(?![a-z(-])';
const HEX_COLOUR = '#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z])';
const CSS_NUMBER =
    '-?(?:[0-9]+\\.?[0-9]*|\\.[0-9]+)(?:%|px|em|rem|deg|turn|vw|vh|ch)?(?![0-9a-zA-Z(])';
const CSS_PUNCTUATION = '[(),/+*\\s-]';
export const HEADER_RULE_PATTERN_SOURCE = `^(?!.*//)(?:${HEADER_RULE_FUNCTIONS}|${CSS_KEYWORD}|${HEX_COLOUR}|${CSS_NUMBER}|${CSS_PUNCTUATION})+$`;
/** font-family：字體名（任何語言）、數字、空格、引號、逗號、連字號 */
export const FONT_FAMILY_PATTERN_SOURCE = `^[\\p{L}\\p{N}\\s'",-]+$`;

const TEXT_PATTERNS = {
    headerRule: { pattern: new RegExp(HEADER_RULE_PATTERN_SOURCE, 'u'), what: 'a CSS gradient' },
    titleFont: { pattern: new RegExp(FONT_FAMILY_PATTERN_SOURCE, 'u'), what: 'a CSS font-family' },
} as const;
const OPTIONAL_TEXT_KEYS = ['titleFont', 'headerRule'] as const;
type ColourKey = (typeof THEME_COLOUR_KEYS)[number];

/** raw[key] 必須係 object，入面 10 個必填色 + optional 嘅 statusBar / accentText / titleFont / headerRule / scheme */
export const readTheme = (ctx: ParseContext, raw: Raw, key = 'theme'): ThemeDefinition => {
    const theme = readRecord(ctx, raw[key], key);
    const colours = Object.fromEntries(
        THEME_COLOUR_KEYS.map((k) => [k, readHex(ctx, theme, k, `${key}.${k}`)]),
    ) as Record<ColourKey, string>;
    const optional: Partial<ThemeDefinition> = {};
    OPTIONAL_COLOUR_KEYS.forEach((k) => {
        if (theme[k] !== undefined) optional[k] = readHex(ctx, theme, k, `${key}.${k}`);
    });
    OPTIONAL_TEXT_KEYS.forEach((k) => {
        const value = readOptionalString(ctx, theme, k, `${key}.${k}`);
        if (value === undefined) return;
        const { pattern, what } = TEXT_PATTERNS[k];
        if (!pattern.test(value)) fail(ctx, `${key}.${k} must be ${what} without url() or escapes`);
        optional[k] = value;
    });
    const scheme = readOptionalEnum(ctx, theme, 'scheme', `${key}.scheme`, SCHEMES);
    return { ...colours, ...optional, ...(scheme ? { scheme } : {}) };
};
