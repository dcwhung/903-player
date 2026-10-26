/* JSON 入面嘅色調（ShowTheme 減圖；圖由 folder 入面嘅檔補上） */
import type { ShowTheme } from '../config/showThemes';
import {
    readHex,
    readOptionalEnum,
    readOptionalString,
    readRecord,
    type ParseContext,
    type Raw,
} from './reader';

export type ThemeDefinition = Omit<ShowTheme, 'art'>;

const COLOUR_KEYS = [
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
const OPTIONAL_TEXT_KEYS = ['titleFont', 'headerRule'] as const;
const SCHEMES = ['light'] as const;

type ColourKey = (typeof COLOUR_KEYS)[number];

/** raw[key] 必須係 object，入面 10 個必填色 + optional 嘅 statusBar / accentText / titleFont / headerRule / scheme */
export const readTheme = (ctx: ParseContext, raw: Raw, key = 'theme'): ThemeDefinition => {
    const theme = readRecord(ctx, raw[key], key);
    const colours = Object.fromEntries(
        COLOUR_KEYS.map((k) => [k, readHex(ctx, theme, k, `${key}.${k}`)]),
    ) as Record<ColourKey, string>;
    const optional: Partial<ThemeDefinition> = {};
    OPTIONAL_COLOUR_KEYS.forEach((k) => {
        if (theme[k] !== undefined) optional[k] = readHex(ctx, theme, k, `${key}.${k}`);
    });
    OPTIONAL_TEXT_KEYS.forEach((k) => {
        const value = readOptionalString(ctx, theme, k, `${key}.${k}`);
        if (value !== undefined) optional[k] = value;
    });
    const scheme = readOptionalEnum(ctx, theme, 'scheme', `${key}.scheme`, SCHEMES);
    return { ...colours, ...optional, ...(scheme ? { scheme } : {}) };
};
