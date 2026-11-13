/*
 * /api/banner（Phase 4）：首頁 banner 兩張圖（窄 1200×517 + 闊 2000×400），已經過 same-origin + session 守門。
 * 同 entries 一樣係「草稿」：PUT / DELETE 只改 D1，POST /api/publish 先寫入 catalog.json。
 * PUT 驗：兩張都要、檔名 <hash>.webp、已上載（assets + R2 有 object）、R2 WebP header 嘅尺寸啱嗰個 slot。
 * 尺寸只 range get 頭 WEBP_HEADER_BYTES bytes（S-901；上載時已經用 parseWebp 驗過成個檔）
 */
import { ASSET_DIMENSIONS, type AssetSize } from '@903-player/catalog';
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import { hashOfImageName } from '../assets/imageName';
import { parseWebpHeader, WEBP_HEADER_BYTES, WebpError } from '../assets/webp';
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

/** storedSize 讀唔到尺寸嘅原因：R2 冇呢個 object / 有但唔係 WebP（S-902 分開報） */
const MISSING = 'missing';
const INVALID = 'invalid';
type StoredSize = AssetSize | typeof MISSING | typeof INVALID;

/** R2 圖嘅闊高：只讀頭部（range get，S-901） */
const storedSize = async (bucket: R2Bucket, name: string): Promise<StoredSize> => {
    const object = await bucket.get(`${CATALOG_IMAGE_KEY_PREFIX}${name}`, {
        range: { offset: 0, length: WEBP_HEADER_BYTES },
    });
    if (!object) return MISSING;
    try {
        return parseWebpHeader(new Uint8Array(await object.arrayBuffer()));
    } catch (error) {
        if (error instanceof WebpError) return INVALID;
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
    if (!(await hasAsset(env.DB, hashOfImageName(name)))) return `${key}: ${name} not uploaded`;
    const actual = await storedSize(env.CATALOG, name);
    if (actual === MISSING) return `${key}: ${name} not uploaded`;
    if (actual === INVALID) return `${key}: ${name} is not a valid WebP`;
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
