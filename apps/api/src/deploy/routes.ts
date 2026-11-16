/*
 * /api/publishes/:id/deploy（App 外觀 plan，已經過 session + same-origin 守門）：
 * - GET：部署狀態 { status, url }（status.ts）
 * - POST：重新部署（再 dispatch + Vercel hook），回 { deploy, deployRequestedAt }；
 *   failed 嗰次 publish（從未上過 R2）→ 409
 */
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import { POSITIVE_INT } from '../catalog/routes';
import { findPublish } from '../catalog/store';
import { HTTP_STATUS } from '../config';
import { requestDeploy } from './afterPublish';
import { deployStatus } from './status';

export const deployRoutes = new Hono<AppEnv>();

const publishOf = async (c: Context<AppEnv>) => {
    const id = c.req.param('id') ?? '';
    return POSITIVE_INT.test(id) ? findPublish(c.env.DB, Number(id)) : null;
};

const noSuchPublish = (c: Context<AppEnv>) =>
    c.json({ error: 'no such publish' }, HTTP_STATUS.notFound);

deployRoutes.get('/publishes/:id/deploy', async (c) => {
    const publish = await publishOf(c);
    if (!publish) return noSuchPublish(c);
    return c.json(await deployStatus(c.env.GITHUB_DEPLOY_TOKEN, publish));
});

deployRoutes.post('/publishes/:id/deploy', async (c) => {
    const publish = await publishOf(c);
    if (!publish) return noSuchPublish(c);
    if (publish.status !== 'ok')
        return c.json({ error: `publish ${publish.id} is not ok` }, HTTP_STATUS.conflict);
    const { deploy, deploy_requested_at: deployRequestedAt } = await requestDeploy(c.env, publish);
    return c.json({ deploy, deployRequestedAt });
});
