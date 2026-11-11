/*
 * 903-player-api（Backend Phase 2a）：
 * - /auth/*：Google login（admin）
 * - /api/*：admin SPA 用嘅 API（/api/health 公開，其餘要 session；改嘢要 same-origin）
 * - /catalog/v1/*：公開 catalog.json + 圖（player 用，CORS 只開畀 PLAYER_ORIGINS）
 * admin SPA（apps/admin/dist）由 static assets 出；/api、/auth、/catalog 一律先行 Worker（run_worker_first）
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
