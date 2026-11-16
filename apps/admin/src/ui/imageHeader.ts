/*
 * S-816：decode 之前由檔頭讀原圖尺寸（PNG IHDR / JPEG SOF / WebP VP8 · VP8L · VP8X），
 * 超過上限就唔使 decode（12000 × 9000 decode 咗會食幾百 MB 記憶體）。讀唔到就 null，交返 decode 後再檢查
 */
import type { Size } from './imageUpload';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;

const JPEG_MARKER = 0xff;
const JPEG_START = 0xd8;
const JPEG_END = 0xd9;
/** SOF0–SOF15，除咗 DHT（C4）、JPG（C8）、DAC（CC） */
const JPEG_SOF_MARKERS = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
/** SOF 段：marker(2) + 長度(2) + 精度(1) → 高(2) → 闊(2) */
const JPEG_SOF_HEIGHT_OFFSET = 5;
const JPEG_SOF_WIDTH_OFFSET = 7;
const JPEG_SEGMENT_HEADER = 2;

const WEBP_FOURCC_OFFSET = 8;
const WEBP_CHUNK_OFFSET = 12;
const WEBP_PAYLOAD_OFFSET = 20;
/** VP8X：flags(4) 之後 24-bit LE 闊 - 1、高 - 1 */
const VP8X_WIDTH_OFFSET = 24;
const VP8X_HEIGHT_OFFSET = 27;
/** VP8（lossy）：frame tag(3) + start code(3) 之後 14-bit LE 闊、高 */
const VP8_WIDTH_OFFSET = 26;
const VP8_HEIGHT_OFFSET = 28;
const VP8_DIMENSION_MASK = 0x3fff;
/** VP8L（lossless）：signature(1) 之後 32 bit：14 bit 闊 - 1、14 bit 高 - 1 */
const VP8L_BITS_OFFSET = 21;
const VP8L_DIMENSION_BITS = 14;

const BYTE_BITS = 8;
const TWO_BYTES = 2 * BYTE_BITS;
const THREE_BYTES = 3 * BYTE_BITS;

const ascii = (bytes: Uint8Array, offset: number, length: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + length));

const uint16 = (bytes: Uint8Array, offset: number) =>
    ((bytes[offset] ?? 0) << BYTE_BITS) | (bytes[offset + 1] ?? 0);

const uint32 = (bytes: Uint8Array, offset: number) =>
    ((uint16(bytes, offset) << TWO_BYTES) >>> 0) + uint16(bytes, offset + 2);

const le16 = (bytes: Uint8Array, offset: number) =>
    (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << BYTE_BITS);

const le24 = (bytes: Uint8Array, offset: number) =>
    le16(bytes, offset) | ((bytes[offset + 2] ?? 0) << TWO_BYTES);

const le32 = (bytes: Uint8Array, offset: number) =>
    (le24(bytes, offset) | ((bytes[offset + 3] ?? 0) << THREE_BYTES)) >>> 0;

const sizeIfComplete = (bytes: Uint8Array, end: number, width: number, height: number) =>
    bytes.length >= end && width > 0 && height > 0 ? { width, height } : null;

const pngSize = (bytes: Uint8Array): Size | null =>
    sizeIfComplete(
        bytes,
        PNG_HEIGHT_OFFSET + 4,
        uint32(bytes, PNG_WIDTH_OFFSET),
        uint32(bytes, PNG_HEIGHT_OFFSET),
    );

/** 逐段跳（每段 FF xx + 2 byte 長度），搵到第一個 SOF 先讀尺寸 */
const jpegSize = (bytes: Uint8Array): Size | null => {
    let offset = 2;
    while (offset + JPEG_SOF_WIDTH_OFFSET + 2 <= bytes.length) {
        if (bytes[offset] !== JPEG_MARKER) return null;
        const marker = bytes[offset + 1] ?? JPEG_END;
        if (marker === JPEG_MARKER) {
            offset += 1;
            continue;
        }
        if (marker === JPEG_END) return null;
        if (JPEG_SOF_MARKERS.has(marker))
            return sizeIfComplete(
                bytes,
                offset + JPEG_SOF_WIDTH_OFFSET + 2,
                uint16(bytes, offset + JPEG_SOF_WIDTH_OFFSET),
                uint16(bytes, offset + JPEG_SOF_HEIGHT_OFFSET),
            );
        offset += JPEG_SEGMENT_HEADER + uint16(bytes, offset + JPEG_SEGMENT_HEADER);
    }
    return null;
};

const webpSize = (bytes: Uint8Array): Size | null => {
    const chunk = ascii(bytes, WEBP_CHUNK_OFFSET, 4);
    if (chunk === 'VP8X')
        return sizeIfComplete(
            bytes,
            VP8X_HEIGHT_OFFSET + 3,
            le24(bytes, VP8X_WIDTH_OFFSET) + 1,
            le24(bytes, VP8X_HEIGHT_OFFSET) + 1,
        );
    if (chunk === 'VP8 ')
        return sizeIfComplete(
            bytes,
            VP8_HEIGHT_OFFSET + 2,
            le16(bytes, VP8_WIDTH_OFFSET) & VP8_DIMENSION_MASK,
            le16(bytes, VP8_HEIGHT_OFFSET) & VP8_DIMENSION_MASK,
        );
    if (chunk !== 'VP8L' || bytes.length < VP8L_BITS_OFFSET + 4) return null;
    const bits = le32(bytes, VP8L_BITS_OFFSET);
    return {
        width: (bits & VP8_DIMENSION_MASK) + 1,
        height: ((bits >>> VP8L_DIMENSION_BITS) & VP8_DIMENSION_MASK) + 1,
    };
};

/** 檔頭 → 原圖尺寸；唔認得 / 唔夠長就 null */
export const readImageSize = (bytes: Uint8Array): Size | null => {
    if (PNG_SIGNATURE.every((byte, i) => bytes[i] === byte)) return pngSize(bytes);
    if (bytes[0] === JPEG_MARKER && bytes[1] === JPEG_START) return jpegSize(bytes);
    if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, WEBP_FOURCC_OFFSET, 4) === 'WEBP')
        return bytes.length >= WEBP_PAYLOAD_OFFSET ? webpSize(bytes) : null;
    return null;
};
