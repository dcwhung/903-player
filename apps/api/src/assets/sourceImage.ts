/*
 * App 圖示原圖（PUT /api/assets/source，icon recrop）：admin 揀嘅原檔原封不動存落 R2，
 * 之後重新裁切由原圖再畫，唔會越裁越差。唔限尺寸（admin decode 前已經檢查 8000 px / 20 MB），
 * 只驗 Content-Type 同檔頭 magic bytes 一致
 */

export interface SourceFormat {
    contentType: string;
    /** 圖檔名副檔名（<hash16>.<extension>） */
    extension: string;
    label: string;
    /** 檔頭 magic bytes（null = 任何 byte） */
    magic: readonly (number | null)[];
}

const ANY = null;
const ascii = (text: string) => [...text].map((character) => character.charCodeAt(0));
const PNG_SIGNATURE_TAIL = [0x0d, 0x0a, 0x1a, 0x0a];
const PNG_SIGNATURE_HEAD = 0x89;
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
/** RIFF 之後 4 byte 係檔案長度 */
const RIFF_SIZE = [ANY, ANY, ANY, ANY];

export const SOURCE_FORMATS: readonly SourceFormat[] = [
    {
        contentType: 'image/png',
        extension: 'png',
        label: 'PNG',
        magic: [PNG_SIGNATURE_HEAD, ...ascii('PNG'), ...PNG_SIGNATURE_TAIL],
    },
    { contentType: 'image/jpeg', extension: 'jpg', label: 'JPEG', magic: JPEG_SIGNATURE },
    {
        contentType: 'image/webp',
        extension: 'webp',
        label: 'WebP',
        magic: [...ascii('RIFF'), ...RIFF_SIZE, ...ascii('WEBP')],
    },
];

/** Content-Type 嘅 media type（去 ; 參數、唔分大細楷）→ 格式；唔收就 undefined */
export const sourceFormatOf = (header: string | undefined): SourceFormat | undefined => {
    const mediaType = (header ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    return SOURCE_FORMATS.find((format) => format.contentType === mediaType);
};

export const matchesMagic = (format: SourceFormat, bytes: Uint8Array): boolean =>
    bytes.length >= format.magic.length &&
    format.magic.every((expected, index) => expected === ANY || bytes[index] === expected);
