/*
 * GET /api/branding/favicon（唔使 login）：admin 分頁 icon 跟已 publish 嘅 App 圖示。
 * 最新 ok publish 嘅 catalog.json 有 branding.icon.favicon → 302 去嗰張圖；冇 → 302 去 admin 內建 /favicon.png。
 * 只睇已發佈（草稿唔算）；no-cache：換咗 icon reload 就跟到（302 本身唔好被長 cache）
 */
import type { Handler } from 'hono';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';

/** apps/admin/public/favicon.png（Worker static assets） */
export const BUILT_IN_FAVICON_PATH = '/favicon.png';
const FAVICON_CACHE_CONTROL = 'no-cache';

/** json_extract 喺 D1 拆，唔使將成份 document 傳返 Worker */
const publishedFavicon = (db: D1Database): Promise<string | null> =>
    db
        .prepare(
            `SELECT json_extract(document, '$.branding.icon.favicon') AS favicon FROM publishes
             WHERE status = 'ok' AND json_valid(document) ORDER BY id DESC LIMIT 1`,
        )
        .first<string | null>('favicon');

export const brandingFavicon: Handler<AppEnv> = async (c) => {
    const favicon = await publishedFavicon(c.env.DB);
    c.header('cache-control', FAVICON_CACHE_CONTROL);
    return c.redirect(
        typeof favicon === 'string' ? favicon : BUILT_IN_FAVICON_PATH,
        HTTP_STATUS.found,
    );
};
