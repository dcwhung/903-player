/* test 用嘅最細 WebP header（parser 只讀 header，唔使真圖像資料） */

const ascii = (text: string): number[] => [...text].map((ch) => ch.charCodeAt(0));
const le16 = (value: number): number[] => [value & 0xff, (value >> 8) & 0xff];
const le24 = (value: number): number[] => [...le16(value), (value >> 16) & 0xff];
const le32 = (value: number): number[] => [...le16(value), ...le16(value >>> 16)];

/** RIFF 容器 + 一個 chunk（payload 單數長度要補 1 byte，同 spec 一樣） */
const riff = (fourcc: string, payload: number[]): Uint8Array => {
    const padded = payload.length % 2 === 1 ? [...payload, 0] : payload;
    const chunk = [...ascii(fourcc), ...le32(payload.length), ...padded];
    return new Uint8Array([
        ...ascii('RIFF'),
        ...le32(4 + chunk.length),
        ...ascii('WEBP'),
        ...chunk,
    ]);
};

/** 有損：frame tag（3 bytes）+ start code + 14-bit 闊高 */
export const webpVp8 = (width: number, height: number): Uint8Array =>
    riff('VP8 ', [0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, ...le16(width), ...le16(height), 0, 0]);

/** 無損：signature 0x2f + 14-bit (闊 - 1)、14-bit (高 - 1) bit-packed */
export const webpVp8l = (width: number, height: number): Uint8Array => {
    const bits = (width - 1) | ((height - 1) << 14);
    return riff('VP8L', [0x2f, ...le32(bits), 0]);
};

/** 擴展：flags + 3 bytes reserved + 24-bit (闊 - 1)、(高 - 1) */
export const webpVp8x = (width: number, height: number): Uint8Array =>
    riff('VP8X', [0x10, 0, 0, 0, ...le24(width - 1), ...le24(height - 1)]);
