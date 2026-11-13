/*
 * 上載 / 驗證嘅圖片格式（PUT /api/assets、banner / branding 驗已上載嘅圖）：
 * WebP = disc / tile / banner（admin 裁切輸出）；PNG = App 圖示（manifest / apple-touch 要 PNG）
 */
import type { AssetSize } from '@903-player/catalog';
import { ASSET_UPLOAD_DIMENSIONS, ICON_UPLOAD_DIMENSIONS } from '../config';
import { parsePng, PNG_HEADER_BYTES, PngError } from './png';
import { parseWebp, parseWebpHeader, WEBP_HEADER_BYTES, WebpError } from './webp';

export interface ImageFormat {
    contentType: string;
    /** 圖檔名副檔名（<hash16>.<extension>） */
    extension: string;
    /** 錯誤 message 用 */
    label: string;
    /** 上載白名單 */
    sizes: readonly AssetSize[];
    /** 成個檔驗證（上載時） */
    parse: (bytes: Uint8Array) => AssetSize;
    /** R2 range get 嘅長度 + 頭部 parser（上載時已驗過成個檔） */
    headerBytes: number;
    parseHeader: (bytes: Uint8Array) => AssetSize;
    /** parse / parseHeader throw 嘅係「唔係呢個格式」（其他 error 照 throw） */
    isFormatError: (error: unknown) => boolean;
}

export const WEBP_FORMAT: ImageFormat = {
    contentType: 'image/webp',
    extension: 'webp',
    label: 'WebP',
    sizes: ASSET_UPLOAD_DIMENSIONS,
    parse: parseWebp,
    headerBytes: WEBP_HEADER_BYTES,
    parseHeader: parseWebpHeader,
    isFormatError: (error) => error instanceof WebpError,
};

export const PNG_FORMAT: ImageFormat = {
    contentType: 'image/png',
    extension: 'png',
    label: 'PNG',
    sizes: ICON_UPLOAD_DIMENSIONS,
    parse: parsePng,
    headerBytes: PNG_HEADER_BYTES,
    parseHeader: parsePng,
    isFormatError: (error) => error instanceof PngError,
};

export const UPLOAD_FORMATS: readonly ImageFormat[] = [WEBP_FORMAT, PNG_FORMAT];

/** Content-Type 嘅 media type（去咗 ; 參數、唔分大細楷）→ 格式；唔收就 undefined */
export const formatOfContentType = (header: string | undefined): ImageFormat | undefined => {
    const mediaType = (header ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    return UPLOAD_FORMATS.find((format) => format.contentType === mediaType);
};

export const sizeLabel = ({ width, height }: AssetSize) => `${width}×${height}`;

export const sameSize = (a: AssetSize, b: AssetSize) =>
    a.width === b.width && a.height === b.height;
