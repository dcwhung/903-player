/*
 * 903-player-api（Backend Phase 2a）：
 * - /auth/*：Google login（admin）
 * - /api/*：admin SPA 用嘅 API（/api/health 公開，其餘要 session；改嘢要 same-origin）
 * - /catalog/v1/*：公開 catalog.json + 圖（player 用，CORS 只開畀 PLAYER_ORIGINS）
 * admin SPA（apps/admin/dist）由 static assets 出；/api、/auth、/catalog 一律先行 Worker（run_worker_first）
 */
import { Hono, type MiddlewareHandler } from 'hono';
import { apiRoutes } from './api/routes';
import type { AppEnv } from './app';
import { authRoutes } from './auth/routes';
import { catalogRoutes } from './catalog/serve';

/**
 * S-774：/auth（「冇權限」頁）同 /api 唔准被其他網站 frame（clickjacking）。
 * CSP 淨係 frame-ancestors：唔加 script-src，唔會擋 deniedPage 嘅 inline theme script（S-815）；
 * X-Frame-Options 照加畀唔識 frame-ancestors 嘅舊瀏覽器。/catalog 係 player 跨站讀嘅公開資料，唔郁
 */
const denyFraming: MiddlewareHandler = async (c, next) => {
    await next();
    c.header('x-frame-options', 'DENY');
    c.header('content-security-policy', "frame-ancestors 'none'");
};

const app = new Hono<AppEnv>();

app.use('/auth/*', denyFraming);
app.use('/api/*', denyFraming);
app.route('/auth', authRoutes);
app.route('/api', apiRoutes);
app.route('/catalog/v1', catalogRoutes);

export default app;
