/* 內容 API（Backend Phase 2b-1）：entries CRUD、R2 掃描、排程；已經過 same-origin + session 守門 */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AppEnv } from '../app';
import { CONTENT_BODY_LIMIT_BYTES, HTTP_STATUS } from '../config';
import { entryRoutes } from './entries';
import { scanRoutes } from './scan';
import { scheduleRoutes } from './schedule';

export const contentRoutes = new Hono<AppEnv>();

contentRoutes.use(
    '*',
    bodyLimit({
        maxSize: CONTENT_BODY_LIMIT_BYTES,
        onError: (c) => c.json({ error: 'request body too large' }, HTTP_STATUS.payloadTooLarge),
    }),
);

contentRoutes.route('/', entryRoutes);
contentRoutes.route('/', scanRoutes);
contentRoutes.route('/', scheduleRoutes);
