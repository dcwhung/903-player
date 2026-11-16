/*
 * /api/banner（Phase 4）：首頁 banner 兩張圖（窄 1200×517 + 闊 2000×400），已經過 same-origin + session 守門。
 * 同 entries 一樣係「草稿」：PUT / DELETE 只改 D1，POST /api/publish 先寫入 catalog.json。
 * PUT 驗：兩張都要、檔名 <hash>.webp、已上載（assets + R2 有 object）、R2 WebP header 嘅尺寸啱嗰個 slot
 *（assets/storedImage.ts；尺寸只 range get 頭 WEBP_HEADER_BYTES bytes，S-901）
 */
import { ASSET_DIMENSIONS } from '@903-player/catalog';
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import { WEBP_FORMAT } from '../assets/formats';
import { storedImageProblem, type ImageSlot } from '../assets/storedImage';
import { HTTP_STATUS } from '../config';
import { errorResponse, readJsonObject } from '../content/http';
import { deleteBanner, getBanner, saveBanner, type BannerImages, type StoredBanner } from './store';

export const bannerRoutes = new Hono<AppEnv>();

const SLOTS: readonly ImageSlot<keyof BannerImages>[] = [
    { key: 'standard', size: ASSET_DIMENSIONS.bannerStandard, format: WEBP_FORMAT },
    { key: 'long', size: ASSET_DIMENSIONS.bannerLong, format: WEBP_FORMAT },
];

const view = (stored: StoredBanner | null) =>
    stored
        ? { banner: { standard: stored.standard, long: stored.long }, updatedAt: stored.updatedAt }
        : { banner: null, updatedAt: null };

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
        const problem = await storedImageProblem(c.env, slot, images[slot.key]);
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
