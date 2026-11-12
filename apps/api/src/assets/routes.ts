/*
 * PUT /api/assets（Phase 2b-2）：admin 上載 disc / tile。已經過 same-origin + session 守門。
 * body = 原始 WebP bytes → 驗 header + 尺寸白名單 → 名 = <sha256 前 16 hex>.webp（同 importLibrary.mjs 一致）。
 * 先寫 R2 後 insert assets：R2 有、D1 冇嘅孤兒檔無害；反過嚟 publish 就會出爛圖
 */
import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { ASSET_MAX_BYTES } from '@903-player/catalog';
import type { AppEnv } from '../app';
import {
    ASSET_CONTENT_TYPE,
    ASSET_EXTENSION,
    ASSET_HASH_HEX_LENGTH,
    ASSET_UPLOAD_DIMENSIONS,
    CATALOG_IMAGE_KEY_PREFIX,
    HTTP_STATUS,
} from '../config';
import { hasAsset, insertAsset } from '../catalog/store';
import { sha256Hex } from '../lib/crypto';
import { parseWebp, WebpError, type WebpSize } from './webp';

export const assetRoutes = new Hono<AppEnv>();

const sizeLabel = ({ width, height }: WebpSize) => `${width}×${height}`;

/** Content-Type 嘅 media type（去咗 ; 參數、唔分大細楷） */
const mediaTypeOf = (header: string | undefined) =>
    (header ?? '').split(';')[0]?.trim().toLowerCase() ?? '';

const requireWebp: MiddlewareHandler<AppEnv> = async (c, next) => {
    if (mediaTypeOf(c.req.header('content-type')) !== ASSET_CONTENT_TYPE)
        return c.json(
            { error: `Content-Type must be ${ASSET_CONTENT_TYPE}` },
            HTTP_STATUS.unsupportedMediaType,
        );
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

const isAllowedSize = (size: WebpSize) =>
    ASSET_UPLOAD_DIMENSIONS.some((d) => d.width === size.width && d.height === size.height);

/** 驗 WebP + 尺寸；唔得就回 422 response */
const checkedSize = (c: Context<AppEnv>, bytes: Uint8Array): WebpSize | Response => {
    let size: WebpSize;
    try {
        size = parseWebp(bytes);
    } catch (error) {
        if (!(error instanceof WebpError)) throw error;
        return c.json({ error: `invalid WebP: ${error.message}` }, HTTP_STATUS.unprocessable);
    }
    if (isAllowedSize(size)) return size;
    const allowed = ASSET_UPLOAD_DIMENSIONS.map(sizeLabel);
    return c.json(
        { error: `image is ${sizeLabel(size)}; allowed sizes: ${allowed.join(', ')}`, allowed },
        HTTP_STATUS.unprocessable,
    );
};

/** R2 先、D1 後（見檔頭） */
const store = async (env: AppEnv['Bindings'], hash: string, bytes: Uint8Array) => {
    const name = `${hash}.${ASSET_EXTENSION}`;
    await env.CATALOG.put(`${CATALOG_IMAGE_KEY_PREFIX}${name}`, bytes, {
        httpMetadata: { contentType: ASSET_CONTENT_TYPE },
    });
    await insertAsset(env.DB, {
        hash,
        contentType: ASSET_CONTENT_TYPE,
        bytes: bytes.length,
        createdAt: new Date().toISOString(),
    });
    return name;
};

assetRoutes.put('/assets', requireWebp, limitSize, async (c) => {
    const bytes = new Uint8Array(await c.req.arrayBuffer());
    const size = checkedSize(c, bytes);
    if (size instanceof Response) return size;
    const hash = (await sha256Hex(bytes)).slice(0, ASSET_HASH_HEX_LENGTH);
    if (await hasAsset(c.env.DB, hash))
        return c.json({ name: `${hash}.${ASSET_EXTENSION}`, existed: true }, HTTP_STATUS.ok);
    const name = await store(c.env, hash, bytes);
    return c.json({ name, ...size, bytes: bytes.length }, HTTP_STATUS.created);
});
