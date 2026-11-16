/* test 用嘅最細 PNG（parser 只讀 signature + IHDR，唔使真圖像資料；CRC 唔驗，填 0） */

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** IHDR 之後：bit depth 8、color type 6（RGBA）、compression / filter / interlace 0 */
const IHDR_TAIL = [8, 6, 0, 0, 0];
const CRC = [0, 0, 0, 0];

const ascii = (text: string): number[] => [...text].map((ch) => ch.charCodeAt(0));
const be32 = (value: number): number[] => [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff);

const chunk = (type: string, data: number[]): number[] => [
    ...be32(data.length),
    ...ascii(type),
    ...data,
    ...CRC,
];

/** signature + IHDR（闊高）+ 一個 IDAT（seed 令唔同 test 嘅 bytes 唔同 hash）+ IEND */
export const pngOf = (width: number, height: number, seed = 0): Uint8Array =>
    new Uint8Array([
        ...SIGNATURE,
        ...chunk('IHDR', [...be32(width), ...be32(height), ...IHDR_TAIL]),
        ...chunk('IDAT', [seed & 0xff]),
        ...chunk('IEND', []),
    ]);

/** 第一個 chunk 唔係 IHDR（例如 sRGB 擺咗頭）：唔合規 */
export const pngWithoutIhdr = (): Uint8Array =>
    new Uint8Array([...SIGNATURE, ...chunk('sRGB', [0]), ...chunk('IEND', [])]);
