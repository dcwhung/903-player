/*
 * /api/banner（Phase 4）：首頁 banner 兩張圖（窄 1200×517 + 闊 2000×400），已經過 same-origin + session 守門。
 * 同 entries 一樣係「草稿」：PUT / DELETE 只改 D1，POST /api/publish 先寫入 catalog.json。
 * PUT 驗：兩張都要、檔名 <hash>.webp、已上載（assets）、R2 WebP header 嘅尺寸啱嗰個 slot
 */
import { ASSET_DIMENSIONS, type AssetSize } from '@903-player/catalog';
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import { parseWebp, WebpError } from '../assets/webp';
import { CATALOG_IMAGE_KEY_PREFIX, HTTP_STATUS, IMAGE_FILE_PATTERN } from '../config';
import { hasAsset } from '../catalog/store';
import { errorResponse, readJsonObject } from '../content/http';
import { deleteBanner, getBanner, saveBanner, type BannerImages, type StoredBanner } from './store';

export const bannerRoutes = new Hono<AppEnv>();

const SLOTS: readonly { key: keyof BannerImages; size: AssetSize }[] = [
    { key: 'standard', size: ASSET_DIMENSIONS.bannerStandard },
    { key: 'long', size: ASSET_DIMENSIONS.bannerLong },
];

const view = (stored: StoredBanner | null) =>
    stored
        ? { banner: { standard: stored.standard, long: stored.long }, updatedAt: stored.updatedAt }
        : { banner: null, updatedAt: null };

const sizeLabel = ({ width, height }: AssetSize) => `${width}×${height}`;

/** R2 圖嘅闊高；冇呢個 object 或者唔係 WebP → null */
const storedSize = async (bucket: R2Bucket, name: string): Promise<AssetSize | null> => {
    const object = await bucket.get(`${CATALOG_IMAGE_KEY_PREFIX}${name}`);
    if (!object) return null;
    try {
        return parseWebp(new Uint8Array(await object.arrayBuffer()));
    } catch (error) {
        if (error instanceof WebpError) return null;
        throw error;
    }
};

/** 一個 slot 嘅問題（冇問題 = undefined） */
const slotProblem = async (
    env: AppEnv['Bindings'],
    { key, size }: (typeof SLOTS)[number],
    name: string,
): Promise<string | undefined> => {
    if (!IMAGE_FILE_PATTERN.test(name) || !name.endsWith('.webp'))
        return `${key}: ${name} is not <hash>.webp`;
    if (!(await hasAsset(env.DB, name.split('.')[0] ?? ''))) return `${key}: ${name} not uploaded`;
    const actual = await storedSize(env.CATALOG, name);
    if (!actual) return `${key}: ${name} not uploaded`;
    if (actual.width !== size.width || actual.height !== size.height)
        return `${key}: ${name} is ${sizeLabel(actual)}; must be ${sizeLabel(size)}`;
    return undefined;
};

/** body → 兩個檔名；唔係 { standard: string, long: string } 就 undefined */
const imagesOf = (body: Record<string, unknown> | undefined): BannerImages | undefined => {
    if (!body || typeof body.standard !== 'string' || typeof body.long !== 'string')
        return undefined;
    return { standard: body.standard, long: body.long };
};

const badBody = (c: Context<AppEnv>) =>
    errorResponse(c, HTTP_STATUS.badRequest, 'body must be { standard, long } image names');

bannerRoutes.get('/banner', async (c) => c.json(view(await getBanner(c.env.DB))));

bannerRoutes.put('/banner', async (c) => {
    const images = imagesOf(await readJsonObject(c));
    if (!images) return badBody(c);
    for (const slot of SLOTS) {
        const problem = await slotProblem(c.env, slot, images[slot.key]);
        if (problem) return errorResponse(c, HTTP_STATUS.unprocessable, problem);
    }
    await saveBanner(c.env.DB, images, new Date().toISOString());
    return c.json(view(await getBanner(c.env.DB)));
});

/** 還原預設：冇 banner 都照 204（重複撳唔會出錯） */
bannerRoutes.delete('/banner', async (c) => {
    await deleteBanner(c.env.DB);
    return c.body(null, HTTP_STATUS.noContent);
});
