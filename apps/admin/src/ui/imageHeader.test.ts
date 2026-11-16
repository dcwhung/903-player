import { readImageSize } from './imageHeader';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const u32 = (value: number) => [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
];
const u16 = (value: number) => [(value >>> 8) & 0xff, value & 0xff];
const le16 = (value: number) => [value & 0xff, (value >>> 8) & 0xff];
const le24 = (value: number) => [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff];
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

const png = (width: number, height: number) =>
    new Uint8Array([...PNG_SIGNATURE, ...u32(13), ...ascii('IHDR'), ...u32(width), ...u32(height)]);

const jpeg = (width: number, height: number) =>
    new Uint8Array([
        0xff,
        0xd8,
        // APP0（JFIF）段：長度 16，入面隨便填
        0xff,
        0xe0,
        ...u16(16),
        ...new Array<number>(14).fill(0),
        // SOF0：長度、精度、高、闊
        0xff,
        0xc0,
        ...u16(17),
        8,
        ...u16(height),
        ...u16(width),
    ]);

const webpChunk = (fourCc: string, payload: number[]) => [
    ...ascii('RIFF'),
    ...le16(0),
    0,
    0,
    ...ascii('WEBP'),
    ...ascii(fourCc),
    ...le16(payload.length),
    0,
    0,
    ...payload,
];

describe('readImageSize', () => {
    it('should read the size of a PNG from its IHDR chunk', () => {
        expect(readImageSize(png(12000, 9000))).toEqual({ width: 12000, height: 9000 });
    });

    it('should read the size of a JPEG from its SOF segment', () => {
        expect(readImageSize(jpeg(4032, 3024))).toEqual({ width: 4032, height: 3024 });
    });

    it('should read the size of an extended WebP (VP8X)', () => {
        const bytes = new Uint8Array(webpChunk('VP8X', [0, 0, 0, 0, ...le24(1199), ...le24(516)]));
        expect(readImageSize(bytes)).toEqual({ width: 1200, height: 517 });
    });

    it('should read the size of a lossy WebP (VP8)', () => {
        const frame = [0, 0, 0, 0x9d, 0x01, 0x2a, ...le16(600), ...le16(600)];
        expect(readImageSize(new Uint8Array(webpChunk('VP8 ', frame)))).toEqual({
            width: 600,
            height: 600,
        });
    });

    it('should read the size of a lossless WebP (VP8L)', () => {
        // 14 bit 闊 - 1、14 bit 高 - 1（little-endian bit 流）
        const bits = (2000 - 1) | ((400 - 1) << 14);
        const frame = [0x2f, bits & 0xff, (bits >>> 8) & 0xff, (bits >>> 16) & 0xff, bits >>> 24];
        expect(readImageSize(new Uint8Array(webpChunk('VP8L', frame)))).toEqual({
            width: 2000,
            height: 400,
        });
    });

    it('should return null when the header is unknown or cut short', () => {
        expect(readImageSize(new Uint8Array([1, 2, 3]))).toBeNull();
        expect(readImageSize(png(1, 1).slice(0, 18))).toBeNull();
        expect(readImageSize(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBeNull();
    });
});
