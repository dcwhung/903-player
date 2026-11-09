/* /api/*：ops 頁 API。註冊次序 = 守門次序：health 公開 → same-origin → session */
import { Hono } from 'hono';
import pkg from '../../package.json';
import type { AppEnv } from '../app';
import { requireSameOrigin, requireSession } from '../auth/middleware';
import { publishRoutes } from '../catalog/routes';

export const apiRoutes = new Hono<AppEnv>();

apiRoutes.get('/health', (c) => c.json({ ok: true, version: pkg.version }));

apiRoutes.use('*', requireSameOrigin, requireSession);

apiRoutes.get('/me', (c) => c.json({ email: c.get('email') }));

apiRoutes.route('/', publishRoutes);
