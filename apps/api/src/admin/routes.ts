/* Phase 3a admin API（apps/api/src/admin）：經 contentRoutes 掛喺 /api 底下，已經過 same-origin + session 守門 */
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { changeRoutes } from './changes';
import { folderRoutes } from './folders';
import { orderRoutes } from './order';
import { renameRoutes } from './rename';
import { adminScanRoutes } from './scan';
import { todoRoutes } from './todos';

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.route('/', adminScanRoutes);
adminRoutes.route('/', todoRoutes);
adminRoutes.route('/', renameRoutes);
adminRoutes.route('/', folderRoutes);
adminRoutes.route('/', orderRoutes);
adminRoutes.route('/', changeRoutes);
