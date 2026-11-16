/*
 * PNG header parser（pure，App 外觀 icon 上載）：驗 8 bytes signature + 第一個 chunk 一定係 IHDR（長度 13），
 * 讀闊高（big-endian，1 至 2^31 - 1）。唔 decode 圖像、唔驗 CRC（admin 喺 browser 用 canvas 輸出）；
 * 上載 API 用嚟擋假檔同驗尺寸白名單，R2 range get 頭 PNG_HEADER_BYTES bytes 都用同一個 function。
 * 格式見 https://www.w3.org/TR/png-3/#5PNG-file-signature
 */
import type { AssetSize } from '@903-player/catalog';

/** 唔係合規 PNG（signature、IHDR） */
export class PngError extends Error {
    override readonly name = 'PngError';
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const UINT32_BYTES = 4;
/** chunk = 4 bytes 長度 + 4 bytes type + data（+ 4 bytes CRC，唔讀） */
const IHDR_LENGTH_OFFSET = SIGNATURE.length;
const IHDR_TYPE_OFFSET = IHDR_LENGTH_OFFSET + UINT32_BYTES;
const IHDR_DATA_OFFSET = IHDR_TYPE_OFFSET + UINT32_BYTES;
/** IHDR data：闊、高（各 4 bytes）+ bit depth、color type、compression、filter、interlace */
const IHDR_DATA_BYTES = 13;
const IHDR_HEIGHT_OFFSET = IHDR_DATA_OFFSET + UINT32_BYTES;
/** spec：闊高最大 2^31 - 1 */
const MAX_DIMENSION = 0x7fffffff;

/** 讀闊高要嘅頭部長度：signature + IHDR chunk header + IHDR data */
export const PNG_HEADER_BYTES = IHDR_DATA_OFFSET + IHDR_DATA_BYTES;

const uint32 = (bytes: Uint8Array, at: number): number =>
    new DataView(bytes.buffer, bytes.byteOffset + at, UINT32_BYTES).getUint32(0);

const typeAt = (bytes: Uint8Array, at: number): string =>
    String.fromCharCode(...bytes.subarray(at, at + UINT32_BYTES));

const dimension = (value: number, what: string): number => {
    if (value < 1 || value > MAX_DIMENSION) throw new PngError(`IHDR ${what} out of range`);
    return value;
};

/** 頭部（至少 PNG_HEADER_BYTES bytes，可以係成個檔）→ 闊高；唔合規 throw PngError */
export const parsePng = (bytes: Uint8Array): AssetSize => {
    if (bytes.length < PNG_HEADER_BYTES || !SIGNATURE.every((b, i) => bytes[i] === b))
        throw new PngError('not a PNG file');
    if (typeAt(bytes, IHDR_TYPE_OFFSET) !== 'IHDR') throw new PngError('first chunk is not IHDR');
    if (uint32(bytes, IHDR_LENGTH_OFFSET) !== IHDR_DATA_BYTES)
        throw new PngError(`IHDR length must be ${IHDR_DATA_BYTES}`);
    return {
        width: dimension(uint32(bytes, IHDR_DATA_OFFSET), 'width'),
        height: dimension(uint32(bytes, IHDR_HEIGHT_OFFSET), 'height'),
    };
};
