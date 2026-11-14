/*
 * 內容 API（Backend Phase 2b-1）：entries CRUD、R2 掃描、排程；Phase 4：首頁 banner、R2 原圖代讀；App 外觀（branding）。
 * 已經過 same-origin + session 守門
 */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AppEnv } from '../app';
import { CONTENT_BODY_LIMIT_BYTES, HTTP_STATUS } from '../config';
import { adminRoutes } from '../admin/routes';
import { bannerRoutes } from '../banner/routes';
import { brandingRoutes } from '../branding/routes';
import { entryRoutes } from './entries';
import { revertRoutes } from './revertRoute';
import { scanRoutes } from './scan';
import { scheduleRoutes } from './schedule';
import { sourceRoutes } from './sources';

export const contentRoutes = new Hono<AppEnv>();

contentRoutes.use(
    '*',
    bodyLimit({
        maxSize: CONTENT_BODY_LIMIT_BYTES,
        onError: (c) => c.json({ error: 'request body too large' }, HTTP_STATUS.payloadTooLarge),
    }),
);

contentRoutes.route('/', entryRoutes);
contentRoutes.route('/', revertRoutes);
contentRoutes.route('/', scanRoutes);
contentRoutes.route('/', scheduleRoutes);
contentRoutes.route('/', sourceRoutes);
contentRoutes.route('/', bannerRoutes);
contentRoutes.route('/', brandingRoutes);
// Phase 3a admin（掃描、待辦、改 ID、資料夾、排序、變更摘要）：同樣受 256 KB body limit
contentRoutes.route('/', adminRoutes);
