/* 色彩換算（#rrggbb ↔ RGB ↔ HSL，0–1）：配色抽色用（mockup admin-phase4 hexToRgb / rgbToHsl / hsl） */

export type Rgb = readonly [number, number, number];
export type Hsl = readonly [number, number, number];

const HEX_RADIX = 16;
const CHANNEL_MAX = 255;
const BYTE_BITS = 8;
const TWO_BYTES = 16;
const BYTE_MASK = 0xff;
const HEX_DIGITS = 2;
/** HSL → RGB（CSS Color 4 算法）：色相分 12 段 */
const HUE_SEGMENTS = 12;
const HUE_SECTORS = 6;
const HUE_OFFSET = { red: 0, green: 8, blue: 4 } as const;
const HALF = 0.5;

const clampChannel = (value: number) => Math.round(Math.max(0, Math.min(CHANNEL_MAX, value)));

export const hexToRgb = (hex: string): Rgb => {
    const value = parseInt(hex.slice(1), HEX_RADIX);
    return [(value >> TWO_BYTES) & BYTE_MASK, (value >> BYTE_BITS) & BYTE_MASK, value & BYTE_MASK];
};

export const rgbToHex = ([red, green, blue]: Rgb): string =>
    `#${[red, green, blue]
        .map((channel) => clampChannel(channel).toString(HEX_RADIX).padStart(HEX_DIGITS, '0'))
        .join('')}`;

const hueOf = (red: number, green: number, blue: number, max: number, delta: number) => {
    if (max === red)
        return ((green - blue) / delta + (green < blue ? HUE_SECTORS : 0)) / HUE_SECTORS;
    if (max === green) return ((blue - red) / delta + 2) / HUE_SECTORS;
    return ((red - green) / delta + 4) / HUE_SECTORS;
};

export const rgbToHsl = (rgb: Rgb): Hsl => {
    const [red, green, blue] = rgb.map((channel) => channel / CHANNEL_MAX) as [
        number,
        number,
        number,
    ];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lightness = (max + min) / 2;
    if (max === min) return [0, 0, lightness];
    const delta = max - min;
    const saturation = lightness > HALF ? delta / (2 - max - min) : delta / (max + min);
    return [hueOf(red, green, blue, max, delta), saturation, lightness];
};

export const hslToHex = (hue: number, saturation: number, lightness: number): string => {
    const channel = (offset: number) => {
        const k = (offset + hue * HUE_SEGMENTS) % HUE_SEGMENTS;
        const a = saturation * Math.min(lightness, 1 - lightness);
        return CHANNEL_MAX * (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
    };
    return rgbToHex([channel(HUE_OFFSET.red), channel(HUE_OFFSET.green), channel(HUE_OFFSET.blue)]);
};

export const hexToHsl = (hex: string): Hsl => rgbToHsl(hexToRgb(hex));
