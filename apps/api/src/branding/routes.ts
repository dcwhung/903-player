/*
 * /api/branding（App 外觀 plan）：App 圖示（五張 PNG + 遮罩底色）同名稱與簡介，已經過 same-origin + session 守門。
 * 同 banner 一樣係「草稿」：PUT / DELETE 只改 D1，POST /api/publish 先寫入 catalog.json 嘅 branding。
 * icon PUT 驗：檔名 <hash>.png、已上載、R2 PNG IHDR 尺寸啱嗰個 slot（assets/storedImage.ts）；
 * text PUT 驗：trim 後非空、長度上限（packages/catalog parseCatalogText，同 publish 同一套）
 */
import {
    ASSET_DIMENSIONS,
    CatalogDocumentError,
    HEX_COLOUR_PATTERN,
    parseCatalogText,
    type IconImageKey,
} from '@903-player/catalog';
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import { PNG_FORMAT } from '../assets/formats';
import { storedImageProblem, type ImageSlot } from '../assets/storedImage';
import { HTTP_STATUS } from '../config';
import { errorResponse, readJsonObject } from '../content/http';
import { iconBodyOf, textBodyOf } from './body';
import { deleteIcon, deleteText, getBranding, saveIcon, saveText } from './store';

export const brandingRoutes = new Hono<AppEnv>();

const ICON_SLOTS: readonly ImageSlot<IconImageKey>[] = [
    { key: 'favicon', size: ASSET_DIMENSIONS.iconFavicon, format: PNG_FORMAT },
    { key: 'appleTouch', size: ASSET_DIMENSIONS.iconAppleTouch, format: PNG_FORMAT },
    { key: 'icon192', size: ASSET_DIMENSIONS.icon192, format: PNG_FORMAT },
    { key: 'icon512', size: ASSET_DIMENSIONS.icon512, format: PNG_FORMAT },
    { key: 'maskable', size: ASSET_DIMENSIONS.iconMaskable, format: PNG_FORMAT },
];

const current = async (c: Context<AppEnv>) => c.json(await getBranding(c.env.DB));

const badBody = (c: Context<AppEnv>, shape: string) =>
    errorResponse(c, HTTP_STATUS.badRequest, `body must be ${shape}`);

const ICON_SHAPE = '{ favicon, appleTouch, icon192, icon512, maskable, maskableBackground }';
const TEXT_SHAPE = '{ name, shortName?, description } strings';

brandingRoutes.get('/branding', current);

brandingRoutes.put('/branding/icon', async (c) => {
    const icon = iconBodyOf(await readJsonObject(c));
    if (!icon) return badBody(c, ICON_SHAPE);
    if (!HEX_COLOUR_PATTERN.test(icon.maskableBackground))
        return errorResponse(c, HTTP_STATUS.unprocessable, 'maskableBackground must be #rrggbb');
    for (const slot of ICON_SLOTS) {
        const problem = await storedImageProblem(c.env, slot, icon[slot.key]);
        if (problem) return errorResponse(c, HTTP_STATUS.unprocessable, problem);
    }
    // 細楷：同一隻色唔會因為大細楷當改咗（brandingChanged）
    const background = icon.maskableBackground.toLowerCase();
    await saveIcon(c.env.DB, { ...icon, maskableBackground: background }, new Date().toISOString());
    return current(c);
});

brandingRoutes.put('/branding/text', async (c) => {
    const text = textBodyOf(await readJsonObject(c));
    if (!text) return badBody(c, TEXT_SHAPE);
    try {
        parseCatalogText(text, 'text');
    } catch (error) {
        if (!(error instanceof CatalogDocumentError)) throw error;
        return errorResponse(c, HTTP_STATUS.unprocessable, error.message);
    }
    await saveText(c.env.DB, text, new Date().toISOString());
    return current(c);
});

/** 還原（用 repo 內建）：冇都照 204（重複撳唔會出錯） */
brandingRoutes.delete('/branding/icon', async (c) => {
    await deleteIcon(c.env.DB);
    return c.body(null, HTTP_STATUS.noContent);
});

brandingRoutes.delete('/branding/text', async (c) => {
    await deleteText(c.env.DB);
    return c.body(null, HTTP_STATUS.noContent);
});
