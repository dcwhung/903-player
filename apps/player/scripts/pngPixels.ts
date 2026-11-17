/*
 * 測試用嘅細 PNG decoder：淨係支援 8-bit RGB / RGBA、non-interlaced（generateIcons.mjs 出嘅 icon 就係咁），
 * 用嚟喺 node test 讀 public/ icon 嘅像素（唔加圖片 dependency）。
 */
import { inflateSync } from 'node:zlib';

export interface PngPixels {
    width: number;
    height: number;
    /** 每像素 RGBA（RGB 圖 alpha = 255） */
    pixel: (x: number, y: number) => [number, number, number, number];
}

const SIGNATURE_BYTES = 8;
const COLOR_TYPE_CHANNELS: Readonly<Record<number, number>> = { 2: 3, 6: 4 };

/** PNG filter 用嘅 Paeth predictor */
const paeth = (left: number, up: number, upLeft: number) => {
    const estimate = left + up - upLeft;
    const toLeft = Math.abs(estimate - left);
    const toUp = Math.abs(estimate - up);
    const toUpLeft = Math.abs(estimate - upLeft);
    if (toLeft <= toUp && toLeft <= toUpLeft) return left;
    return toUp <= toUpLeft ? up : upLeft;
};

const readChunks = (bytes: Buffer) => {
    let offset = SIGNATURE_BYTES;
    let header: Buffer | null = null;
    const data: Buffer[] = [];
    while (offset < bytes.length) {
        const length = bytes.readUInt32BE(offset);
        const type = bytes.toString('ascii', offset + 4, offset + 8);
        const body = bytes.subarray(offset + 8, offset + 8 + length);
        if (type === 'IHDR') header = body;
        if (type === 'IDAT') data.push(body);
        offset += length + 12;
    }
    if (!header) throw new Error('PNG has no IHDR');
    return { header, data: Buffer.concat(data) };
};

/** 逐行還原 filter（0 None、1 Sub、2 Up、3 Average、4 Paeth） */
const unfilter = (raw: Buffer, height: number, stride: number, channels: number) => {
    const out = Buffer.alloc(height * stride);
    for (let row = 0; row < height; row++) {
        const filter = raw[row * (stride + 1)] ?? 0;
        const line = raw.subarray(row * (stride + 1) + 1, (row + 1) * (stride + 1));
        for (let i = 0; i < stride; i++) {
            const left = i >= channels ? (out[row * stride + i - channels] ?? 0) : 0;
            const up = row > 0 ? (out[(row - 1) * stride + i] ?? 0) : 0;
            const upLeft =
                row > 0 && i >= channels ? (out[(row - 1) * stride + i - channels] ?? 0) : 0;
            const predictor = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][filter] ?? 0;
            out[row * stride + i] = ((line[i] ?? 0) + predictor) & 0xff;
        }
    }
    return out;
};

export const decodePng = (bytes: Buffer): PngPixels => {
    const { header, data } = readChunks(bytes);
    const width = header.readUInt32BE(0);
    const height = header.readUInt32BE(4);
    const channels = COLOR_TYPE_CHANNELS[header[9] ?? -1];
    if (header[8] !== 8 || !channels || header[12] !== 0)
        throw new Error('only 8-bit non-interlaced RGB / RGBA PNG is supported');
    const stride = width * channels;
    const pixels = unfilter(inflateSync(data), height, stride, channels);
    return {
        width,
        height,
        pixel: (x, y) => {
            const at = y * stride + x * channels;
            const [r = 0, g = 0, b = 0] = pixels.subarray(at, at + 3);
            return [r, g, b, channels === 4 ? (pixels[at + 3] ?? 0) : 255];
        },
    };
};
