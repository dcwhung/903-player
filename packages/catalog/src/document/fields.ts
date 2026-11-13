/*
 * catalog.json 結構驗證共用嘅細件（document.ts 同 branding.ts 共用）：錯誤 class、object / 圖 URL / 已知 key 檢查。
 * 錯誤 message 一律「catalog.json: <path> <原因>」
 */

/** 錯誤 message 前綴 + documentSource 嘅 Folder.source */
export const DOCUMENT_NAME = 'catalog.json';

export class CatalogDocumentError extends Error {
    override readonly name = 'CatalogDocumentError';
}

export type Raw = Record<string, unknown>;

/** catalog.json 入面一張圖：https 絕對 URL 或者同 origin 嘅絕對路徑（同 images manifest 嘅值一樣） */
export type AssetRef = string;

/** 同 origin 嘅絕對路徑：/ 開頭但唔係 //（protocol-relative 會變第二個 host） */
const SAME_ORIGIN_PATH_PATTERN = /^\/(?!\/)/;
/** https + 最少一個字嘅 host（package 唔用 DOM 嘅 URL；同 schema 用同一條 pattern） */
const HTTPS_URL_PATTERN = /^https:\/\/[^/?#\s]+([/?#].*)?$/;

export const fail = (path: string, message: string): never => {
    throw new CatalogDocumentError(`${DOCUMENT_NAME}: ${path} ${message}`);
};

export const isRecord = (value: unknown): value is Raw =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const readRecord = (value: unknown, path: string): Raw =>
    isRecord(value) ? value : fail(path, 'must be an object');

/** https 絕對 URL（要有 host），或者同 origin 嘅絕對路徑 */
export const isCatalogImageUrl = (url: string): boolean =>
    SAME_ORIGIN_PATH_PATTERN.test(url) || HTTPS_URL_PATTERN.test(url);

export const readImageUrl = (value: unknown, path: string): AssetRef =>
    typeof value === 'string' && isCatalogImageUrl(value)
        ? value
        : fail(path, 'must be an https URL or a same-origin absolute path');

/** object 唔准多出 key（打錯字會靜靜雞冇咗嗰樣嘢）；回原 object */
export const readKnownKeys = (value: unknown, path: string, keys: readonly string[]): Raw => {
    const raw = readRecord(value, path);
    Object.keys(raw).forEach((key) => {
        if (!keys.includes(key)) fail(path, `has an unknown key "${key}"`);
    });
    return raw;
};
