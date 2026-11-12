/*
 * 配色候選（純 function，方便 test）：Design Origin: mockup: _mockups_/admin-phase4/index.html#d
 *（extractPalette / buildTheme / deriveAccentText / buildPool）。
 * 碟面縮細做 64×64 → 每個 channel 取高 4 bit 分桶、按數量排 → 揀互相有距離嘅主色 →
 * 九套候選（唔同底色 × 深 / 淺），每輪出三套；淺色候選自動推 statusBar / accentText（對 bg ≥ 4.5:1）
 */
import { contrastRatio, TEXT_MIN_CONTRAST } from '@903-player/catalog';
import { THEME_COLOUR_KEYS, type EntryTheme } from '../../model/theme';
import { hexToHsl, hslToHex, rgbToHex } from './colour';

export const CANDIDATES_PER_ROUND = 3;

/** 抽色：最多幾隻主色、兩隻色喺 RGB 空間最少要差幾遠先算唔同 */
const MAX_COLOURS = 6;
const MIN_COLOUR_DISTANCE = 60;
const BUCKET_SHIFT = 4;
const CHANNELS = 4;
/** alpha 低過一半當透明（PNG 碟面四角） */
const MIN_ALPHA = 128;

const WHITE = '#ffffff';
/** 深色字（同 NEUTRAL_THEME.bg） */
const NEAR_BLACK = '#141414';
const BLACK = '#000000';
/** deriveAccentText：每步暗 1%，最暗到 5% */
const DARKEN_STEP = 0.01;
const DARKEST = 0.05;

/** 底色飽和度上限（太鮮唔適合做大面積底） */
const BASE_SATURATION_MAX = 0.55;
/** 鮮色評分：飽和度 × 離中間亮度越遠越扣分 */
const VIVID_LIGHTNESS_PENALTY = 1.4;
const MID_LIGHTNESS = 0.5;

const LIGHT = {
    bg: { saturationMax: 0.45, lightness: 0.92 },
    surface: { saturationMax: 0.45, lightness: 0.96 },
    track: { saturationMax: 0.4, lightness: 0.82 },
    shadowDark: { saturationMax: 0.35, lightness: 0.82 },
    text: { saturation: 0.3, lightness: 0.15 },
    muted: { saturation: 0.15, lightness: 0.38 },
    accent: { saturationMin: 0.5, lightnessMin: 0.42, lightnessMax: 0.55 },
    titleLightness: 0.32,
} as const;

const DARK = {
    bg: 0.1,
    surface: 0.15,
    track: { saturationScale: 0.8, lightness: 0.26 },
    shadowDark: 0.05,
    shadowLight: 0.18,
    title: { saturation: 0.6, lightness: 0.92 },
    text: { saturation: 0.25, lightness: 0.95 },
    muted: { saturation: 0.2, lightness: 0.68 },
    accent: { saturationMin: 0.55, lightnessMin: 0.55, lightnessMax: 0.68 },
} as const;

export type Scheme = 'light' | 'dark';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const distance = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - (b[i] ?? 0)));

/** RGBA 像素 → 最多 6 隻主色（#rrggbb，多到少） */
export const extractPalette = (data: Uint8ClampedArray): string[] => {
    const buckets = new Map<number, [number, number, number, number]>();
    for (let i = 0; i + CHANNELS - 1 < data.length; i += CHANNELS) {
        const [red = 0, green = 0, blue = 0, alpha = 0] = data.subarray(i, i + CHANNELS);
        if (alpha < MIN_ALPHA) continue;
        const key =
            ((red >> BUCKET_SHIFT) << 8) | ((green >> BUCKET_SHIFT) << 4) | (blue >> BUCKET_SHIFT);
        const bucket = buckets.get(key) ?? [0, 0, 0, 0];
        buckets.set(key, [bucket[0] + red, bucket[1] + green, bucket[2] + blue, bucket[3] + 1]);
    }
    const ranked = [...buckets.values()]
        .map(([r, g, b, n]) => ({ rgb: [r / n, g / n, b / n], count: n }))
        .sort((a, b) => b.count - a.count);
    const picked: number[][] = [];
    for (const { rgb } of ranked) {
        if (picked.every((p) => distance(p, rgb) > MIN_COLOUR_DISTANCE)) picked.push(rgb);
        if (picked.length === MAX_COLOURS) break;
    }
    return picked.map((rgb) => rgbToHex(rgb as [number, number, number]));
};

const ratio = (a: string, b: string) => contrastRatio(a, b) ?? 0;

/** 強調色上面嘅字：白定深色，揀對比高嗰個 */
const bestOn = (background: string) =>
    ratio(background, WHITE) >= ratio(background, NEAR_BLACK) ? WHITE : NEAR_BLACK;

/** 淺色底：accent 逐步變深，直到對 bg 同白色都 ≥ 4.5:1（播緊嗰集、狀態列白字底） */
export const deriveAccentText = (accent: string, background: string): string => {
    const [hue, saturation, start] = hexToHsl(accent);
    for (let lightness = start; lightness > DARKEST; lightness -= DARKEN_STEP) {
        const colour = hslToHex(hue, saturation, lightness);
        if (
            ratio(colour, background) >= TEXT_MIN_CONTRAST &&
            ratio(colour, WHITE) >= TEXT_MIN_CONTRAST
        )
            return colour;
    }
    return BLACK;
};

const buildLight = (hue: number, saturation: number, accentHsl: readonly number[]): EntryTheme => {
    const [accentHue = 0, accentSaturation = 0, accentLightness = 0] = accentHsl;
    const at = ({ saturationMax, lightness }: { saturationMax: number; lightness: number }) =>
        hslToHex(hue, Math.min(saturation, saturationMax), lightness);
    const vivid = Math.max(accentSaturation, LIGHT.accent.saturationMin);
    const bg = at(LIGHT.bg);
    const accent = hslToHex(
        accentHue,
        vivid,
        clamp(accentLightness, LIGHT.accent.lightnessMin, LIGHT.accent.lightnessMax),
    );
    const accentText = deriveAccentText(accent, bg);
    return {
        bg,
        surface: at(LIGHT.surface),
        track: at(LIGHT.track),
        accent,
        onAccent: bestOn(accent),
        title: hslToHex(accentHue, vivid, LIGHT.titleLightness),
        text: hslToHex(hue, LIGHT.text.saturation, LIGHT.text.lightness),
        muted: hslToHex(hue, LIGHT.muted.saturation, LIGHT.muted.lightness),
        shadowDark: at(LIGHT.shadowDark),
        shadowLight: WHITE,
        scheme: 'light',
        accentText,
        statusBar: accentText,
    };
};

const buildDark = (hue: number, saturation: number, accentHsl: readonly number[]): EntryTheme => {
    const [accentHue = 0, accentSaturation = 0, accentLightness = 0] = accentHsl;
    const accent = hslToHex(
        accentHue,
        Math.max(accentSaturation, DARK.accent.saturationMin),
        clamp(accentLightness, DARK.accent.lightnessMin, DARK.accent.lightnessMax),
    );
    return {
        bg: hslToHex(hue, saturation, DARK.bg),
        surface: hslToHex(hue, saturation, DARK.surface),
        track: hslToHex(hue, saturation * DARK.track.saturationScale, DARK.track.lightness),
        accent,
        onAccent: bestOn(accent),
        title: hslToHex(hue, DARK.title.saturation, DARK.title.lightness),
        text: hslToHex(hue, DARK.text.saturation, DARK.text.lightness),
        muted: hslToHex(hue, DARK.muted.saturation, DARK.muted.lightness),
        shadowDark: hslToHex(hue, saturation, DARK.shadowDark),
        shadowLight: hslToHex(hue, saturation, DARK.shadowLight),
    };
};

/** 一套候選：底色 base（色相）+ 強調色 accent */
export const buildTheme = (base: string, accent: string, scheme: Scheme): EntryTheme => {
    const [hue, baseSaturation] = hexToHsl(base);
    const saturation = Math.min(baseSaturation, BASE_SATURATION_MAX);
    const build = scheme === 'light' ? buildLight : buildDark;
    return build(hue, saturation, hexToHsl(accent));
};

export type CandidateLabel =
    | 'dominantDark'
    | 'vividDark'
    | 'dominantLight'
    | 'secondDark'
    | 'secondLight'
    | 'vividLight'
    | 'thirdDark'
    | 'dominantDarkAlt'
    | 'thirdLight';

export interface ThemeCandidate {
    label: CandidateLabel;
    theme: EntryTheme;
}

const vividness = (hex: string) => {
    const [, saturation, lightness] = hexToHsl(hex);
    return saturation * (1 - Math.abs(lightness - MID_LIGHTNESS) * VIVID_LIGHTNESS_PENALTY);
};

/** 九套候選（每輪三套：唔同底色 × 深 / 淺）；「更換另外三套」輪下一組，輪完由頭 */
export const buildPool = (palette: readonly string[]): ThemeCandidate[] => {
    const first = palette[0] ?? NEAR_BLACK;
    const byVividness = [...palette].sort((a, b) => vividness(b) - vividness(a));
    const vivid = byVividness[0] ?? first;
    const vivid2 = byVividness[1] ?? vivid;
    const rest = palette.filter((colour) => colour !== vivid);
    const dominant = rest[0] ?? first;
    const second = rest[1] ?? first;
    const third = rest[2] ?? palette[1] ?? first;
    const recipes: [CandidateLabel, string, string, Scheme][] = [
        ['dominantDark', dominant, vivid, 'dark'],
        ['vividDark', vivid, vivid2, 'dark'],
        ['dominantLight', dominant, vivid, 'light'],
        ['secondDark', second, vivid, 'dark'],
        ['secondLight', second, vivid2, 'light'],
        ['vividLight', vivid, vivid2, 'light'],
        ['thirdDark', third, vivid2, 'dark'],
        ['dominantDarkAlt', dominant, vivid2, 'dark'],
        ['thirdLight', third, vivid, 'light'],
    ];
    return recipes.map(([label, base, accent, scheme]) => ({
        label,
        theme: buildTheme(base, accent, scheme),
    }));
};

/**
 * 套用候選：10 色換晒；淺色連 scheme / statusBar / accentText，深色就冇呢三個；
 * titleFont / headerRule（同 art）原封不動保留
 */
export const toEntryTheme = (candidate: EntryTheme, current: EntryTheme): EntryTheme => {
    const colours = Object.fromEntries(THEME_COLOUR_KEYS.map((key) => [key, candidate[key]]));
    const light =
        candidate.scheme === 'light'
            ? {
                  scheme: candidate.scheme,
                  ...(candidate.statusBar ? { statusBar: candidate.statusBar } : {}),
                  ...(candidate.accentText ? { accentText: candidate.accentText } : {}),
              }
            : {};
    return {
        ...(colours as Pick<EntryTheme, (typeof THEME_COLOUR_KEYS)[number]>),
        ...light,
        ...(current.titleFont ? { titleFont: current.titleFont } : {}),
        ...(current.headerRule ? { headerRule: current.headerRule } : {}),
    };
};
