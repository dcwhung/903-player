/* test 共用：打 Worker、login、Google token endpoint mock */
import { env } from 'cloudflare:test';
import worker from '../src/index';
import { createSession } from '../src/auth/session';

export const ORIGIN = env.WORKER_ORIGIN;
export const ADMIN = 'donald.cw.hung@gmail.com';

export const call = (path: string, init: RequestInit = {}): Promise<Response> =>
    Promise.resolve(worker.fetch(new Request(new URL(path, ORIGIN), init), env));

/** 開一個真 session（同 callback 一樣經 createSession），回 Cookie header */
export const loginCookie = async (email = ADMIN, now = Date.now()): Promise<string> => {
    const token = await createSession(env.DB, email, now);
    return `__Host-session=${token}`;
};

/** 已 login + same-origin 嘅 POST */
export const adminPost = async (path: string): Promise<Response> =>
    call(path, { method: 'POST', headers: { cookie: await loginCookie(), origin: ORIGIN } });

export const adminGet = async (path: string): Promise<Response> =>
    call(path, { headers: { cookie: await loginCookie() } });

const base64Url = (value: unknown): string =>
    btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');

/** 假 id_token（callback 直接由 Google token endpoint 攞，唔驗簽名） */
export const idToken = (claims: Record<string, unknown>): string =>
    [base64Url({ alg: 'RS256' }), base64Url(claims), 'sig'].join('.');

export const googleClaims = (email: string, extra: Record<string, unknown> = {}) => ({
    iss: 'https://accounts.google.com',
    aud: env.GOOGLE_CLIENT_ID,
    email,
    email_verified: true,
    ...extra,
});

/** Set-Cookie 入面某個 cookie 嘅 name=value */
export const cookiePair = (response: Response, name: string): string | undefined =>
    response.headers
        .getSetCookie()
        .map((line) => line.split(';')[0] ?? '')
        .find((pair) => pair.startsWith(`${name}=`));

/** 已 login + same-origin 嘅任何 method（body 係 object 就 JSON） */
export const adminRequest = async (
    method: string,
    path: string,
    { body, headers = {} }: { body?: unknown; headers?: Record<string, string> } = {},
): Promise<Response> =>
    call(path, {
        method,
        headers: {
            cookie: await loginCookie(),
            origin: ORIGIN,
            ...(body === undefined ? {} : { 'content-type': 'application/json' }),
            ...headers,
        },
        ...(body === undefined
            ? {}
            : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });
