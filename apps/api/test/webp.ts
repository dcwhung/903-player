/* test 用嘅最細 WebP（parser 只讀 header 同 chunk 結構，唔使真圖像資料） */

const ascii = (text: string): number[] => [...text].map((ch) => ch.charCodeAt(0));
const le16 = (value: number): number[] => [value & 0xff, (value >> 8) & 0xff];
const le24 = (value: number): number[] => [...le16(value), (value >> 16) & 0xff];
const le32 = (value: number): number[] => [...le16(value), ...le16(value >>> 16)];

/** 一個 chunk：fourcc + size + payload（單數長度要補 1 byte，同 spec 一樣） */
export const chunk = (fourcc: string, payload: number[]): number[] => {
    const padded = payload.length % 2 === 1 ? [...payload, 0] : payload;
    return [...ascii(fourcc), ...le32(payload.length), ...padded];
};

/** RIFF 容器包住幾個 chunk */
export const riffOf = (chunks: number[][]): Uint8Array => {
    const body = chunks.flat();
    return new Uint8Array([...ascii('RIFF'), ...le32(4 + body.length), ...ascii('WEBP'), ...body]);
};

/** frame tag bit 0 = 0 係 keyframe（VP8 spec 9.1，位係反嘅） */
const KEY_FRAME_TAG = 0x30;

/** 有損 payload：frame tag（3 bytes）+ start code + 14-bit 闊高 */
export const vp8Payload = (width: number, height: number, tag = KEY_FRAME_TAG): number[] => [
    tag,
    0x01,
    0x00,
    0x9d,
    0x01,
    0x2a,
    ...le16(width),
    ...le16(height),
    0,
    0,
];

/** 無損 payload：signature 0x2f + 14-bit (闊 - 1)、14-bit (高 - 1) bit-packed */
export const vp8lPayload = (width: number, height: number): number[] => [
    0x2f,
    ...le32((width - 1) | ((height - 1) << 14)),
    0,
];

/** 擴展 header payload：flags + 3 bytes reserved + 24-bit (闊 - 1)、(高 - 1) */
export const vp8xPayload = (width: number, height: number): number[] => [
    0x10,
    0,
    0,
    0,
    ...le24(width - 1),
    ...le24(height - 1),
];

/** 有損 */
export const webpVp8 = (width: number, height: number): Uint8Array =>
    riffOf([chunk('VP8 ', vp8Payload(width, height))]);

/** 無損 */
export const webpVp8l = (width: number, height: number): Uint8Array =>
    riffOf([chunk('VP8L', vp8lPayload(width, height))]);

/** 擴展：VP8X header + 一個 VP8L 圖像 chunk（S-795：淨係 VP8X 冇圖像會被拒） */
export const webpVp8x = (width: number, height: number): Uint8Array =>
    riffOf([chunk('VP8X', vp8xPayload(width, height)), chunk('VP8L', vp8lPayload(width, height))]);
