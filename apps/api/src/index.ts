/*
 * 903-player-api（Backend Phase 2a）：
 * - /auth/*：Google login（admin）
 * - /api/*：ops 頁用嘅 API（/api/health 公開，其餘要 session；改嘢要 same-origin）
 * - /catalog/v1/*：公開 catalog.json + 圖（player 用，CORS 只開畀 PLAYER_ORIGINS）
 * ops 頁本身（public/）由 static assets 出，唔經呢度
 */
import { Hono } from 'hono';
import { apiRoutes } from './api/routes';
import type { AppEnv } from './app';
import { authRoutes } from './auth/routes';
import { catalogRoutes } from './catalog/serve';

const app = new Hono<AppEnv>();

app.route('/auth', authRoutes);
app.route('/api', apiRoutes);
app.route('/catalog/v1', catalogRoutes);

export default app;
