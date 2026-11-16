/*
 * PUT /api/assets（Phase 2b-2；App 外觀加 PNG）：admin 上載 disc / tile / banner（WebP）同 App 圖示（PNG）。
 * 已經過 same-origin + session 守門。body = 原始 bytes → 按 Content-Type 驗格式 + 尺寸白名單 →
 * 名 = <sha256 前 16 hex>.<webp|png>（同 importLibrary.mjs 一致）。
 * 先寫 R2 後 insert assets：R2 有、D1 冇嘅孤兒檔無害；反過嚟 publish 就會出爛圖。
 * PUT /api/assets/source（icon recrop）：App 圖示原圖，任何尺寸、PNG / JPEG / WebP、上限 20 MB（sourceImage.ts）
 */
import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { ASSET_MAX_BYTES, type AssetSize } from '@903-player/catalog';
import type { AppEnv } from '../app';
import {
    ASSET_HASH_HEX_LENGTH,
    CATALOG_IMAGE_KEY_PREFIX,
    HTTP_STATUS,
    R2_SOURCE_MAX_BYTES,
} from '../config';
import { hasAsset, insertAsset } from '../catalog/store';
import { sha256Hex } from '../lib/crypto';
import {
    formatOfContentType,
    sameSize,
    sizeLabel,
    UPLOAD_FORMATS,
    type ImageFormat,
} from './formats';
import { matchesMagic, sourceFormatOf, SOURCE_FORMATS } from './sourceImage';

export const assetRoutes = new Hono<AppEnv>();

type AssetEnv = AppEnv & { Variables: { format: ImageFormat } };

const ACCEPTED = UPLOAD_FORMATS.map((format) => format.contentType).join(' or ');

const requireImage: MiddlewareHandler<AssetEnv> = async (c, next) => {
    const format = formatOfContentType(c.req.header('content-type'));
    if (!format)
        return c.json(
            { error: `Content-Type must be ${ACCEPTED}` },
            HTTP_STATUS.unsupportedMediaType,
        );
    c.set('format', format);
    await next();
};

const limitSize = bodyLimit({
    maxSize: ASSET_MAX_BYTES,
    onError: (c) =>
        c.json(
            { error: `image larger than ${ASSET_MAX_BYTES} bytes` },
            HTTP_STATUS.payloadTooLarge,
        ),
});

/** 驗格式 + 尺寸；唔得就回 422 response */
const checkedSize = (
    c: Context<AssetEnv>,
    format: ImageFormat,
    bytes: Uint8Array,
): AssetSize | Response => {
    let size: AssetSize;
    try {
        size = format.parse(bytes);
    } catch (error) {
        if (!format.isFormatError(error)) throw error;
        const { message } = error as Error;
        return c.json({ error: `invalid ${format.label}: ${message}` }, HTTP_STATUS.unprocessable);
    }
    if (format.sizes.some((allowed) => sameSize(allowed, size))) return size;
    const allowed = format.sizes.map(sizeLabel);
    return c.json(
        { error: `image is ${sizeLabel(size)}; allowed sizes: ${allowed.join(', ')}`, allowed },
        HTTP_STATUS.unprocessable,
    );
};

/** R2 先、D1 後（見檔頭） */
const store = async (
    env: AppEnv['Bindings'],
    { hash, format }: { hash: string; format: Pick<ImageFormat, 'extension' | 'contentType'> },
    bytes: Uint8Array,
) => {
    const name = `${hash}.${format.extension}`;
    await env.CATALOG.put(`${CATALOG_IMAGE_KEY_PREFIX}${name}`, bytes, {
        httpMetadata: { contentType: format.contentType },
    });
    await insertAsset(env.DB, {
        hash,
        contentType: format.contentType,
        bytes: bytes.length,
        createdAt: new Date().toISOString(),
    });
    return name;
};

assetRoutes.put('/assets', requireImage, limitSize, async (c) => {
    const format = c.get('format');
    const bytes = new Uint8Array(await c.req.arrayBuffer());
    const size = checkedSize(c, format, bytes);
    if (size instanceof Response) return size;
    const hash = (await sha256Hex(bytes)).slice(0, ASSET_HASH_HEX_LENGTH);
    if (await hasAsset(c.env.DB, hash))
        return c.json({ name: `${hash}.${format.extension}`, existed: true }, HTTP_STATUS.ok);
    const name = await store(c.env, { hash, format }, bytes);
    return c.json({ name, ...size, bytes: bytes.length }, HTTP_STATUS.created);
});

const SOURCE_ACCEPTED = SOURCE_FORMATS.map((format) => format.contentType).join(', ');

const limitSourceSize = bodyLimit({
    maxSize: R2_SOURCE_MAX_BYTES,
    onError: (c) =>
        c.json(
            { error: `image larger than ${R2_SOURCE_MAX_BYTES} bytes` },
            HTTP_STATUS.payloadTooLarge,
        ),
});

assetRoutes.put('/assets/source', limitSourceSize, async (c) => {
    const format = sourceFormatOf(c.req.header('content-type'));
    if (!format)
        return c.json(
            { error: `Content-Type must be ${SOURCE_ACCEPTED}` },
            HTTP_STATUS.unsupportedMediaType,
        );
    const bytes = new Uint8Array(await c.req.arrayBuffer());
    if (!matchesMagic(format, bytes))
        return c.json({ error: `invalid ${format.label}` }, HTTP_STATUS.unprocessable);
    const hash = (await sha256Hex(bytes)).slice(0, ASSET_HASH_HEX_LENGTH);
    if (await hasAsset(c.env.DB, hash))
        return c.json({ name: `${hash}.${format.extension}`, existed: true }, HTTP_STATUS.ok);
    const name = await store(c.env, { hash, format }, bytes);
    return c.json({ name, bytes: bytes.length }, HTTP_STATUS.created);
});
