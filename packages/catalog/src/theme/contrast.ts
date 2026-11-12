/*
 * WCAG 2.x contrast（relative luminance）同 theme 色對檢查：admin theme 編輯器顯示、publish 出警告用。
 * 唔合格只係警告（唔 throw）；認唔到嘅色當唔合格，ratio = null
 */
import type { ShowTheme } from '../showTheme';

/** 一般文字（WCAG AA） */
export const TEXT_MIN_CONTRAST = 4.5;
/** 強調色文字（播緊嗰集、現正播放標籤；大字 / UI 元件，WCAG AA） */
export const ACCENT_TEXT_MIN_CONTRAST = 3;

/** theme 嘅色值：#rrggbb（同 themeSchema 一樣） */
const HEX_COLOUR_PATTERN = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const HEX_RADIX = 16;
const CHANNEL_MAX = 255;
/** sRGB → linear（WCAG 2.x relative luminance 定義） */
const SRGB_LINEAR_THRESHOLD = 0.04045;
const SRGB_LINEAR_DIVISOR = 12.92;
const SRGB_GAMMA_OFFSET = 0.055;
const SRGB_GAMMA_SCALE = 1.055;
const SRGB_GAMMA = 2.4;
const LUMINANCE_WEIGHTS = [0.2126, 0.7152, 0.0722] as const;
/** contrast = (L1 + 0.05) / (L2 + 0.05) */
const FLARE = 0.05;

const toLinear = (channel: number): number => {
    const c = channel / CHANNEL_MAX;
    return c <= SRGB_LINEAR_THRESHOLD
        ? c / SRGB_LINEAR_DIVISOR
        : ((c + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_SCALE) ** SRGB_GAMMA;
};

/** #rrggbb 嘅 relative luminance（0–1）；唔係 #rrggbb 就 null */
export const relativeLuminance = (hex: string): number | null => {
    const match = HEX_COLOUR_PATTERN.exec(hex);
    if (!match) return null;
    return LUMINANCE_WEIGHTS.reduce(
        (sum, weight, i) => sum + weight * toLinear(parseInt(match[i + 1] ?? '', HEX_RADIX)),
        0,
    );
};

/** 兩隻色嘅 contrast ratio（1–21，次序唔拘）；任何一隻認唔到就 null */
export const contrastRatio = (a: string, b: string): number | null => {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    if (la === null || lb === null) return null;
    return (Math.max(la, lb) + FLARE) / (Math.min(la, lb) + FLARE);
};

/** 檢查要用嘅 theme 色（ShowTheme / ThemeDefinition 都得） */
export type ContrastTheme = Pick<
    ShowTheme,
    'bg' | 'surface' | 'accent' | 'onAccent' | 'title' | 'text' | 'muted' | 'accentText'
>;

type ContrastKey = keyof ContrastTheme;

export interface ContrastWarning {
    foreground: ContrastKey;
    background: ContrastKey;
    /** 實際比例；色值認唔到就 null */
    ratio: number | null;
    minimum: number;
}

interface ContrastPair {
    foreground: ContrastKey;
    background: ContrastKey;
    minimum: number;
}

const TEXT_KEYS = ['title', 'text', 'muted'] as const;
const TEXT_BACKGROUNDS = ['bg', 'surface'] as const;

/** 要檢查嘅色對（次序 = 警告次序） */
const pairsOf = (theme: ContrastTheme): ContrastPair[] => [
    ...TEXT_BACKGROUNDS.flatMap((background) =>
        TEXT_KEYS.map((foreground) => ({ foreground, background, minimum: TEXT_MIN_CONTRAST })),
    ),
    { foreground: 'onAccent', background: 'accent', minimum: TEXT_MIN_CONTRAST },
    {
        // 冇 accentText 嘅 theme 用 accent 做文字（ShowTheme.accentText 註解）
        foreground: theme.accentText === undefined ? 'accent' : 'accentText',
        background: 'bg',
        minimum: ACCENT_TEXT_MIN_CONTRAST,
    },
];

/** theme 每對色嘅 contrast：唔合格（或者色值認唔到）就列入警告，全部合格回傳 [] */
export const checkThemeContrast = (theme: ContrastTheme): ContrastWarning[] =>
    pairsOf(theme).flatMap(({ foreground, background, minimum }) => {
        const ratio = contrastRatio(theme[foreground] ?? '', theme[background] ?? '');
        return ratio !== null && ratio >= minimum
            ? []
            : [{ foreground, background, ratio, minimum }];
    });
