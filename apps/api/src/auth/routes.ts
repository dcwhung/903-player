/* /auth/*：Google login（start / callback）同 logout */
import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { AppEnv } from '../app';
import {
    HTTP_STATUS,
    OAUTH_COOKIE,
    OAUTH_STATE_TTL_SECONDS,
    SESSION_COOKIE,
    SESSION_TTL_SECONDS,
} from '../config';
import { isAdminEmail } from '../lib/env';
import { deniedPage } from './deniedPage';
import { authorizationUrl, exchangeCode, GoogleAuthError } from './google';
import { requireSameOrigin } from './middleware';
import { newOAuthState, openOAuthState, sealOAuthState } from './oauthState';
import { createSession, deleteSession } from './session';

/** __Host- cookie 一定要 Secure + Path=/ + 冇 Domain */
const HOST_COOKIE = { httpOnly: true, secure: true, sameSite: 'Lax', path: '/' } as const;

export const authRoutes = new Hono<AppEnv>();

authRoutes.get('/google/start', async (c) => {
    const value = newOAuthState();
    setCookie(c, OAUTH_COOKIE, await sealOAuthState(c.env.SESSION_SECRET, value), {
        ...HOST_COOKIE,
        maxAge: OAUTH_STATE_TTL_SECONDS,
    });
    const selectAccount = c.req.query('select_account') === '1';
    return c.redirect(
        await authorizationUrl(c.env, { ...value, selectAccount }),
        HTTP_STATUS.found,
    );
});

/** state 啱 → 換 token → 驗 email → 開 session；失敗唔開 session */
const finishLogin = async (c: Context<AppEnv>, code: string, verifier: string) => {
    const identity = await exchangeCode(c.env, code, verifier);
    if (!identity.emailVerified || !isAdminEmail(c.env.ADMIN_EMAILS, identity.email)) {
        return c.html(deniedPage(identity.email), HTTP_STATUS.forbidden);
    }
    const token = await createSession(c.env.DB, identity.email);
    setCookie(c, SESSION_COOKIE, token, { ...HOST_COOKIE, maxAge: SESSION_TTL_SECONDS });
    return c.redirect('/', HTTP_STATUS.found);
};

authRoutes.get('/google/callback', async (c) => {
    // 用戶喺 Google 撳取消（error=access_denied）：返 ops 頁
    if (c.req.query('error')) return c.redirect('/', HTTP_STATUS.found);
    const cookie = getCookie(c, OAUTH_COOKIE);
    deleteCookie(c, OAUTH_COOKIE, HOST_COOKIE);
    const verifier = await openOAuthState(c.env.SESSION_SECRET, cookie, c.req.query('state'));
    const code = c.req.query('code');
    if (!verifier || !code)
        return c.text('Login expired or invalid. Try again.', HTTP_STATUS.badRequest);
    try {
        return await finishLogin(c, code, verifier);
    } catch (error) {
        if (!(error instanceof GoogleAuthError)) throw error;
        console.warn('[auth] Google login failed', error.message);
        return c.text('Google login failed. Try again.', HTTP_STATUS.badGateway);
    }
});

authRoutes.post('/logout', requireSameOrigin, async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) await deleteSession(c.env.DB, token);
    deleteCookie(c, SESSION_COOKIE, HOST_COOKIE);
    return c.body(null, HTTP_STATUS.noContent);
});
