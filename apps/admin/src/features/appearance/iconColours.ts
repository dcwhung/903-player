/*
 * Android 遮罩底色（Q1）：由裁切後 icon 嘅邊緣像素抽 2 個最常見嘅色 + 黑 + 白，預設第一個抽色。
 * 邊緣先量化（每個 channel 16 級）再數，透明像素唔計；第二個色要同第一個差得夠遠先算
 */
import type { CropRect } from '../../ui/cropGeometry';

export const BLACK = '#000000';
export const WHITE = '#ffffff';
/** 抽色用嘅縮細圖邊長（px）：邊緣 4 × 32 粒像素夠代表 */
export const SAMPLE_PX = 32;
const MAX_EXTRACTED = 2;
const CHANNELS = 4;
const OPAQUE_MIN = 128;
/** 每個 channel 量化：右移 4 bit = 16 級 */
const QUANT_SHIFT = 4;
/** 兩個抽色最少要差幾多（RGB 歐氏距離），太近就唔要第二個 */
const MIN_DISTANCE = 48;
const HEX_RADIX = 16;
const HEX_DIGITS = 2;

type Rgb = [number, number, number];

interface Bucket {
    count: number;
    sum: Rgb;
}

/** 邊緣一圈嘅像素 index（唔重複） */
const edgeIndexes = (size: number): number[] => {
    const indexes = new Set<number>();
    for (let i = 0; i < size; i += 1) {
        indexes.add(i).add((size - 1) * size + i);
        indexes.add(i * size).add(i * size + size - 1);
    }
    return [...indexes];
};

const bucketsOf = (data: Uint8ClampedArray, size: number): Bucket[] => {
    const buckets = new Map<string, Bucket>();
    for (const index of edgeIndexes(size)) {
        const at = index * CHANNELS;
        const rgb: Rgb = [data[at] ?? 0, data[at + 1] ?? 0, data[at + 2] ?? 0];
        if ((data[at + 3] ?? 0) < OPAQUE_MIN) continue;
        const key = rgb.map((c) => c >> QUANT_SHIFT).join(',');
        const bucket = buckets.get(key) ?? { count: 0, sum: [0, 0, 0] };
        bucket.count += 1;
        bucket.sum = [bucket.sum[0] + rgb[0], bucket.sum[1] + rgb[1], bucket.sum[2] + rgb[2]];
        buckets.set(key, bucket);
    }
    return [...buckets.values()].sort((a, b) => b.count - a.count);
};

const average = ({ count, sum }: Bucket): Rgb => [
    Math.round(sum[0] / count),
    Math.round(sum[1] / count),
    Math.round(sum[2] / count),
];

const distance = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const hexOf = (rgb: Rgb) =>
    `#${rgb.map((c) => c.toString(HEX_RADIX).padStart(HEX_DIGITS, '0')).join('')}`;

/** RGBA 像素（size × size）→ 邊緣最常見嘅色（最多 2 個，#rrggbb） */
export const edgeColours = (data: Uint8ClampedArray, size: number): string[] => {
    const picked: Rgb[] = [];
    for (const bucket of bucketsOf(data, size)) {
        const colour = average(bucket);
        if (picked.every((other) => distance(other, colour) >= MIN_DISTANCE)) picked.push(colour);
        if (picked.length === MAX_EXTRACTED) break;
    }
    return picked.map(hexOf);
};

/** 四個底色：抽色（最多 2 個）+ 黑 + 白（重複嘅只留一個） */
export const swatchesOf = (extracted: readonly string[]): string[] => [
    ...new Set([...extracted.slice(0, MAX_EXTRACTED), BLACK, WHITE]),
];

type CreateCanvas = (width: number, height: number) => HTMLCanvasElement;

/** 將裁切框縮落 SAMPLE_PX 再抽色；冇 2d context（jsdom）= 冇抽色 */
export const sampleEdgeColours = (
    image: CanvasImageSource,
    box: CropRect,
    createCanvas: CreateCanvas,
): string[] => {
    const canvas = createCanvas(SAMPLE_PX, SAMPLE_PX);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return [];
    context.drawImage(image, box.x, box.y, box.width, box.height, 0, 0, SAMPLE_PX, SAMPLE_PX);
    return edgeColours(context.getImageData(0, 0, SAMPLE_PX, SAMPLE_PX).data, SAMPLE_PX);
};
