/*
 * /api/* 守門：
 * - requireSession：要有效 session（/api/health 除外，喺 router 先註冊）
 * - requireSameOrigin：POST / PUT / PATCH / DELETE 要 Origin = WORKER_ORIGIN（CSRF；SameSite=Lax 之外多一層）
 */
import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../app';
import { HTTP_STATUS, SESSION_COOKIE } from '../config';
import { findSession } from './session';

const SAFE_METHODS: readonly string[] = ['GET', 'HEAD', 'OPTIONS'];

export const requireSameOrigin = createMiddleware<AppEnv>(async (c, next) => {
    if (SAFE_METHODS.includes(c.req.method)) return next();
    if (c.req.header('origin') !== c.env.WORKER_ORIGIN) {
        return c.json({ error: 'cross-origin request refused' }, HTTP_STATUS.forbidden);
    }
    return next();
});

export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    const email = token ? await findSession(c.env.DB, token) : undefined;
    if (!email) return c.json({ error: 'not logged in' }, HTTP_STATUS.unauthorized);
    c.set('email', email);
    return next();
});
