/*
 * WebP header parser（pure）：驗 RIFF / WEBP magic，由第一個 chunk（VP8 / VP8L / VP8X）讀闊高。
 * 只讀 header，唔 decode 圖像；上載 API 用嚟擋假檔同驗尺寸白名單。
 * 格式見 https://developers.google.com/speed/webp/docs/riff_container
 */

export interface WebpSize {
    width: number;
    height: number;
}

/** 唔係合規 WebP（magic、chunk、長度） */
export class WebpError extends Error {
    override readonly name = 'WebpError';
}

/** RIFF header：'RIFF' + 4 bytes size + 'WEBP' */
const RIFF_HEADER_BYTES = 12;
/** chunk header：fourcc + 4 bytes size；第一個 chunk 嘅 payload 由呢度開始 */
const CHUNK_HEADER_BYTES = 8;
const FIRST_CHUNK = RIFF_HEADER_BYTES;
const PAYLOAD = FIRST_CHUNK + CHUNK_HEADER_BYTES;
/** RIFF size 欄位唔計 'RIFF' 同 size 本身 */
const RIFF_SIZE_EXCLUDED_BYTES = 8;

/** VP8：3 bytes frame tag + start code 9d 01 2a + 2 × 16-bit（低 14 bit 係尺寸，高 2 bit 係 scale） */
const VP8_START_CODE = [0x9d, 0x01, 0x2a] as const;
const VP8_START_OFFSET = 3;
const VP8_SIZE_OFFSET = 6;
const VP8_SIZE_MASK = 0x3fff;
const VP8_MIN_PAYLOAD = 10;

/** VP8L：signature 0x2f + 32 bit：14 bit (闊 - 1)、14 bit (高 - 1) */
const VP8L_SIGNATURE = 0x2f;
const VP8L_SIZE_BITS = 14;
const VP8L_SIZE_MASK = (1 << VP8L_SIZE_BITS) - 1;
const VP8L_MIN_PAYLOAD = 5;

/** VP8X：1 byte flags + 3 bytes reserved + 24-bit (闊 - 1) + 24-bit (高 - 1) */
const VP8X_WIDTH_OFFSET = 4;
const VP8X_HEIGHT_OFFSET = 7;
const VP8X_MIN_PAYLOAD = 10;

const fourcc = (bytes: Uint8Array, at: number): string =>
    String.fromCharCode(...bytes.subarray(at, at + 4));

const uint16 = (bytes: Uint8Array, at: number): number =>
    (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8);

const uint24 = (bytes: Uint8Array, at: number): number =>
    uint16(bytes, at) | ((bytes[at + 2] ?? 0) << 16);

const uint32 = (bytes: Uint8Array, at: number): number =>
    (uint16(bytes, at) | (uint16(bytes, at + 2) << 16)) >>> 0;

const vp8 = (payload: Uint8Array): WebpSize => {
    const startCode = VP8_START_CODE.every((b, i) => payload[VP8_START_OFFSET + i] === b);
    if (!startCode) throw new WebpError('VP8: missing start code');
    return {
        width: uint16(payload, VP8_SIZE_OFFSET) & VP8_SIZE_MASK,
        height: uint16(payload, VP8_SIZE_OFFSET + 2) & VP8_SIZE_MASK,
    };
};

const vp8l = (payload: Uint8Array): WebpSize => {
    if (payload[0] !== VP8L_SIGNATURE) throw new WebpError('VP8L: missing signature');
    const bits = uint32(payload, 1);
    return {
        width: (bits & VP8L_SIZE_MASK) + 1,
        height: ((bits >>> VP8L_SIZE_BITS) & VP8L_SIZE_MASK) + 1,
    };
};

const vp8x = (payload: Uint8Array): WebpSize => ({
    width: uint24(payload, VP8X_WIDTH_OFFSET) + 1,
    height: uint24(payload, VP8X_HEIGHT_OFFSET) + 1,
});

const READERS: Record<string, { minPayload: number; read: (payload: Uint8Array) => WebpSize }> = {
    'VP8 ': { minPayload: VP8_MIN_PAYLOAD, read: vp8 },
    VP8L: { minPayload: VP8L_MIN_PAYLOAD, read: vp8l },
    VP8X: { minPayload: VP8X_MIN_PAYLOAD, read: vp8x },
};

/** RIFF / WEBP magic + 宣告長度唔可以長過收到嘅 bytes（截短嘅檔） */
const checkContainer = (bytes: Uint8Array) => {
    if (bytes.length < PAYLOAD || fourcc(bytes, 0) !== 'RIFF' || fourcc(bytes, 8) !== 'WEBP')
        throw new WebpError('not a RIFF / WEBP file');
    if (uint32(bytes, 4) + RIFF_SIZE_EXCLUDED_BYTES > bytes.length)
        throw new WebpError('file is truncated');
};

/** 合規就回闊高，唔合規 throw WebpError */
export const parseWebp = (bytes: Uint8Array): WebpSize => {
    checkContainer(bytes);
    const kind = fourcc(bytes, FIRST_CHUNK);
    const reader = READERS[kind];
    if (!reader) throw new WebpError(`unknown first chunk "${kind}"`);
    const size = uint32(bytes, FIRST_CHUNK + 4);
    if (size < reader.minPayload || PAYLOAD + size > bytes.length)
        throw new WebpError(`${kind.trim()} chunk is truncated`);
    return reader.read(bytes.subarray(PAYLOAD, PAYLOAD + size));
};
