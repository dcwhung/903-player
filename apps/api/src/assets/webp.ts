/*
 * WebP header parser（pure）：驗 RIFF / WEBP magic，由第一個 chunk（VP8 / VP8L / VP8X）讀闊高。
 * 唔 decode 圖像（admin 上載前用 createImageBitmap decode 過）；上載 API 用嚟擋假檔同驗尺寸白名單。
 * 輕量結構檢查（S-795）：VP8 一定要係 keyframe；VP8X 後面一定要有圖像 chunk（VP8 / VP8L，
 * 動畫係 ANMF），ALPH 只係 VP8 嘅 alpha，單獨唔算圖。圖像 chunk 同樣驗 start code / signature。
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

/** fourcc（'RIFF'、'WEBP'、chunk 名）同 size 欄位都係 4 bytes（S-794） */
const FOURCC_BYTES = 4;
const SIZE_FIELD_BYTES = 4;
/** RIFF header：'RIFF' + 4 bytes size + 'WEBP' */
const RIFF_SIZE_OFFSET = FOURCC_BYTES;
const WEBP_MAGIC_OFFSET = RIFF_SIZE_OFFSET + SIZE_FIELD_BYTES;
const RIFF_HEADER_BYTES = WEBP_MAGIC_OFFSET + FOURCC_BYTES;
/** chunk header：fourcc + 4 bytes size；第一個 chunk 嘅 payload 由呢度開始 */
const CHUNK_SIZE_OFFSET = FOURCC_BYTES;
const CHUNK_HEADER_BYTES = CHUNK_SIZE_OFFSET + SIZE_FIELD_BYTES;
const FIRST_CHUNK = RIFF_HEADER_BYTES;
const PAYLOAD = FIRST_CHUNK + CHUNK_HEADER_BYTES;
/** RIFF size 欄位唔計 'RIFF' 同 size 本身 */
const RIFF_SIZE_EXCLUDED_BYTES = FOURCC_BYTES + SIZE_FIELD_BYTES;

/**
 * VP8：3 bytes frame tag + start code 9d 01 2a + 2 × 16-bit（低 14 bit 係尺寸，高 2 bit 係 scale）。
 * frame tag bit 0 = 0 先係 keyframe（RFC 6386 9.1，位係反嘅）；WebP 只可以係 keyframe
 */
const VP8_INTERFRAME_BIT = 0x01;
const VP8_START_CODE = [0x9d, 0x01, 0x2a] as const;
const VP8_START_OFFSET = 3;
const VP8_WIDTH_OFFSET = 6;
/** 闊後面緊接高（16-bit = 2 bytes） */
const VP8_HEIGHT_OFFSET = VP8_WIDTH_OFFSET + 2;
const VP8_SIZE_MASK = 0x3fff;
const VP8_MIN_PAYLOAD = 10;

/** VP8L：signature 0x2f + 32 bit：14 bit (闊 - 1)、14 bit (高 - 1) */
const VP8L_SIGNATURE = 0x2f;
const VP8L_SIZE_OFFSET = 1;
const VP8L_SIZE_BITS = 14;
const VP8L_SIZE_MASK = (1 << VP8L_SIZE_BITS) - 1;
const VP8L_MIN_PAYLOAD = 5;

/** VP8X：1 byte flags + 3 bytes reserved + 24-bit (闊 - 1) + 24-bit (高 - 1) */
const VP8X_WIDTH_OFFSET = 4;
const VP8X_HEIGHT_OFFSET = 7;
const VP8X_MIN_PAYLOAD = 10;

const fourcc = (bytes: Uint8Array, at: number): string =>
    String.fromCharCode(...bytes.subarray(at, at + FOURCC_BYTES));

const uint16 = (bytes: Uint8Array, at: number): number =>
    (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8);

const uint24 = (bytes: Uint8Array, at: number): number =>
    uint16(bytes, at) | ((bytes[at + 2] ?? 0) << 16);

const uint32 = (bytes: Uint8Array, at: number): number =>
    (uint16(bytes, at) | (uint16(bytes, at + 2) << 16)) >>> 0;

const vp8 = (payload: Uint8Array): WebpSize => {
    const startCode = VP8_START_CODE.every((b, i) => payload[VP8_START_OFFSET + i] === b);
    if (((payload[0] ?? 0) & VP8_INTERFRAME_BIT) !== 0)
        throw new WebpError('VP8: frame is not a keyframe');
    if (!startCode) throw new WebpError('VP8: missing start code');
    return {
        width: uint16(payload, VP8_WIDTH_OFFSET) & VP8_SIZE_MASK,
        height: uint16(payload, VP8_HEIGHT_OFFSET) & VP8_SIZE_MASK,
    };
};

const vp8l = (payload: Uint8Array): WebpSize => {
    if (payload[0] !== VP8L_SIGNATURE) throw new WebpError('VP8L: missing signature');
    const bits = uint32(payload, VP8L_SIZE_OFFSET);
    return {
        width: (bits & VP8L_SIZE_MASK) + 1,
        height: ((bits >>> VP8L_SIZE_BITS) & VP8L_SIZE_MASK) + 1,
    };
};

const vp8x = (payload: Uint8Array): WebpSize => ({
    width: uint24(payload, VP8X_WIDTH_OFFSET) + 1,
    height: uint24(payload, VP8X_HEIGHT_OFFSET) + 1,
});

interface Reader {
    minPayload: number;
    read: (payload: Uint8Array) => WebpSize;
}

/** 圖像 chunk（單獨一個 chunk 嘅簡單格式，或者 VP8X 後面） */
const IMAGE_READERS: Record<string, Reader> = {
    'VP8 ': { minPayload: VP8_MIN_PAYLOAD, read: vp8 },
    VP8L: { minPayload: VP8L_MIN_PAYLOAD, read: vp8l },
};
const VP8X_READER: Reader = { minPayload: VP8X_MIN_PAYLOAD, read: vp8x };
/** 動畫 frame：入面再包 VP8 / VP8L；唔拆，有就當有圖 */
const ANIMATION_FRAME = 'ANMF';

interface Chunk {
    kind: string;
    payload: Uint8Array;
    /** 下一個 chunk 由邊度開始（payload 單數長度補 1 byte） */
    next: number;
}

/** 讀 at 位嘅 chunk；長度超出 end 就係截短 */
const chunkAt = (bytes: Uint8Array, at: number, end: number): Chunk => {
    const kind = fourcc(bytes, at);
    const size = uint32(bytes, at + CHUNK_SIZE_OFFSET);
    const start = at + CHUNK_HEADER_BYTES;
    if (start + size > end) throw new WebpError(`${kind.trim()} chunk is truncated`);
    return { kind, payload: bytes.subarray(start, start + size), next: start + size + (size & 1) };
};

const readChunk = ({ kind, payload }: Chunk, reader: Reader): WebpSize => {
    if (payload.length < reader.minPayload)
        throw new WebpError(`${kind.trim()} chunk is truncated`);
    return reader.read(payload);
};

/** VP8X 後面嘅 chunk：圖像 chunk 要讀得通；搵唔到 VP8 / VP8L / ANMF 就唔係圖 */
const checkExtendedImage = (bytes: Uint8Array, from: number, end: number): void => {
    let hasImage = false;
    for (let at = from; at + CHUNK_HEADER_BYTES <= end;) {
        const chunk = chunkAt(bytes, at, end);
        const reader = IMAGE_READERS[chunk.kind];
        if (reader) readChunk(chunk, reader);
        if (reader || chunk.kind === ANIMATION_FRAME) hasImage = true;
        at = chunk.next;
    }
    if (!hasImage) throw new WebpError('VP8X: no image chunk (VP8 / VP8L / ANMF)');
};

/** RIFF / WEBP magic + 宣告長度唔可以長過收到嘅 bytes（截短嘅檔）；回 RIFF 結束位 */
const checkContainer = (bytes: Uint8Array): number => {
    if (
        bytes.length < PAYLOAD ||
        fourcc(bytes, 0) !== 'RIFF' ||
        fourcc(bytes, WEBP_MAGIC_OFFSET) !== 'WEBP'
    )
        throw new WebpError('not a RIFF / WEBP file');
    const end = uint32(bytes, RIFF_SIZE_OFFSET) + RIFF_SIZE_EXCLUDED_BYTES;
    if (end > bytes.length) throw new WebpError('file is truncated');
    return end;
};

/** 合規就回闊高，唔合規 throw WebpError */
export const parseWebp = (bytes: Uint8Array): WebpSize => {
    const end = checkContainer(bytes);
    const first = chunkAt(bytes, FIRST_CHUNK, end);
    if (first.kind !== 'VP8X') {
        const reader = IMAGE_READERS[first.kind];
        if (!reader) throw new WebpError(`unknown first chunk "${first.kind}"`);
        return readChunk(first, reader);
    }
    const size = readChunk(first, VP8X_READER);
    checkExtendedImage(bytes, first.next, end);
    return size;
};
