/*
 * 已上載圖嘅檢查（PUT /api/banner、PUT /api/branding/icon 共用）：檔名 <hash>.<ext>、assets 有、
 * R2 有 object 而且頭部係嗰個格式、尺寸啱個 slot。尺寸只 range get 頭部（S-901）
 */
import type { AssetSize } from '@903-player/catalog';
import { CATALOG_IMAGE_KEY_PREFIX, SERVED_IMAGE_FILE_PATTERN } from '../config';
import { hasAsset } from '../catalog/store';
import { sameSize, sizeLabel, type ImageFormat } from './formats';
import { hashOfImageName } from './imageName';

/** storedSize 讀唔到尺寸嘅原因：R2 冇呢個 object / 有但唔係嗰個格式（S-902 分開報） */
const MISSING = 'missing';
const INVALID = 'invalid';
type StoredSize = AssetSize | typeof MISSING | typeof INVALID;

export interface ImageSlot<K extends string = string> {
    key: K;
    size: AssetSize;
    format: ImageFormat;
}

/** R2 圖嘅闊高：只讀頭部 */
const storedSize = async (bucket: R2Bucket, name: string, format: ImageFormat) => {
    const object = await bucket.get(`${CATALOG_IMAGE_KEY_PREFIX}${name}`, {
        range: { offset: 0, length: format.headerBytes },
    });
    if (!object) return MISSING;
    try {
        return format.parseHeader(new Uint8Array(await object.arrayBuffer())) as StoredSize;
    } catch (error) {
        if (format.isFormatError(error)) return INVALID;
        throw error;
    }
};

/** 一個 slot 嘅問題（冇問題 = undefined） */
export const storedImageProblem = async (
    env: { DB: D1Database; CATALOG: R2Bucket },
    { key, size, format }: ImageSlot,
    name: string,
): Promise<string | undefined> => {
    if (!SERVED_IMAGE_FILE_PATTERN.test(name) || !name.endsWith(`.${format.extension}`))
        return `${key}: ${name} is not <hash>.${format.extension}`;
    if (!(await hasAsset(env.DB, hashOfImageName(name)))) return `${key}: ${name} not uploaded`;
    const actual = await storedSize(env.CATALOG, name, format);
    if (actual === MISSING) return `${key}: ${name} not uploaded`;
    if (actual === INVALID) return `${key}: ${name} is not a valid ${format.label}`;
    if (!sameSize(actual, size))
        return `${key}: ${name} is ${sizeLabel(actual)}; must be ${sizeLabel(size)}`;
    return undefined;
};
