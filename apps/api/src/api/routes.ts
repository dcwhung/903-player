/* /api/*：admin API。註冊次序 = 守門次序：health 公開 → same-origin → session */
import { Hono } from 'hono';
import pkg from '../../package.json';
import type { AppEnv } from '../app';
import { assetRoutes } from '../assets/routes';
import { requireSameOrigin, requireSession } from '../auth/middleware';
import { publishRoutes } from '../catalog/routes';
import { contentRoutes } from '../content/routes';

export const apiRoutes = new Hono<AppEnv>();

apiRoutes.get('/health', (c) => c.json({ ok: true, version: pkg.version }));

apiRoutes.use('*', requireSameOrigin, requireSession);

apiRoutes.get('/me', (c) => c.json({ email: c.get('email') }));

apiRoutes.route('/', publishRoutes);
// 圖片上載要喺 contentRoutes 之前：contentRoutes 嘅 256 KB body limit 係 '*' middleware，
// 排後面會先擋咗大過 256 KB 嘅圖（assets 自己有 1 MB 上限）
apiRoutes.route('/', assetRoutes);
apiRoutes.route('/', contentRoutes);
