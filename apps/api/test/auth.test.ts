import { env } from 'cloudflare:test';
import { afterEach, vi } from 'vitest';
import { SESSION_TTL_MS } from '../src/config';
import { ADMIN, ORIGIN, call, cookiePair, googleClaims, idToken, loginCookie } from './helpers';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** 行 /auth/google/start，回 Google 嘅 redirect URL 同 state cookie */
const start = async (query = '') => {
    const response = await call(`/auth/google/start${query}`);
    const location = new URL(response.headers.get('location') ?? '');
    return { response, location, cookie: cookiePair(response, '__Host-oauth') ?? '' };
};

/** Google token endpoint mock：記低 request body，回指定 claims */
const mockGoogle = (claims: Record<string, unknown>, status = 200) => {
    const bodies: URLSearchParams[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        expect(String(input instanceof Request ? input.url : input)).toBe(TOKEN_URL);
        bodies.push(new URLSearchParams(String(init?.body)));
        return Response.json({ id_token: idToken(claims) }, { status });
    });
    return bodies;
};

const callback = (state: string, cookie: string) =>
    call(`/auth/google/callback?code=auth-code&state=${state}`, { headers: { cookie } });

afterEach(() => vi.restoreAllMocks());

describe('GET /auth/google/start', () => {
    it('should redirect to Google with PKCE S256, openid email scope and our callback', async () => {
        const { response, location, cookie } = await start();
        expect(response.status).toBe(302);
        expect(location.origin + location.pathname).toBe(
            'https://accounts.google.com/o/oauth2/v2/auth',
        );
        expect(Object.fromEntries(location.searchParams)).toMatchObject({
            client_id: env.GOOGLE_CLIENT_ID,
            redirect_uri: `${ORIGIN}/auth/google/callback`,
            response_type: 'code',
            scope: 'openid email',
            code_challenge_method: 'S256',
        });
        expect(location.searchParams.get('code_challenge')).toMatch(/^[\w-]{43}$/);
        expect(cookie).not.toBe('');
    });

    it('should set a short-lived HttpOnly Secure state cookie', async () => {
        const { response } = await start();
        const line = response.headers.getSetCookie().find((l) => l.startsWith('__Host-oauth='));
        expect(line).toMatch(/HttpOnly/i);
        expect(line).toMatch(/Secure/i);
        expect(line).toMatch(/Path=\//);
        expect(line).toMatch(/Max-Age=600/);
    });

    it('should ask Google to pick an account when switching account', async () => {
        const { location } = await start('?select_account=1');
        expect(location.searchParams.get('prompt')).toBe('select_account');
    });
});

describe('GET /auth/google/callback', () => {
    it('should exchange the code with the PKCE verifier and open a 30-day session', async () => {
        const { location, cookie } = await start();
        const bodies = mockGoogle(googleClaims(ADMIN));
        const response = await callback(location.searchParams.get('state') ?? '', cookie);

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('/');
        const body = bodies[0];
        expect(body?.get('code')).toBe('auth-code');
        expect(body?.get('grant_type')).toBe('authorization_code');
        expect(body?.get('client_secret')).toBe(env.GOOGLE_CLIENT_SECRET);
        expect(body?.get('code_verifier')).toMatch(/^[\w-]{43}$/);
        const line = response.headers.getSetCookie().find((l) => l.startsWith('__Host-session='));
        expect(line).toMatch(/HttpOnly/i);
        expect(line).toMatch(/Secure/i);
        expect(line).toMatch(/SameSite=Lax/i);
        expect(line).toMatch(/Path=\//);
        expect(line).toMatch(new RegExp(`Max-Age=${SESSION_TTL_MS / 1000}`));
    });

    it('should store only the SHA-256 of the session token', async () => {
        const { location, cookie } = await start();
        mockGoogle(googleClaims(ADMIN));
        const response = await callback(location.searchParams.get('state') ?? '', cookie);
        const token = cookiePair(response, '__Host-session')?.split('=')[1] ?? '';
        const rows = await env.DB.prepare('SELECT token_hash, email FROM sessions').all();
        expect(rows.results).toHaveLength(1);
        expect(rows.results[0]?.email).toBe(ADMIN);
        expect(rows.results[0]?.token_hash).toMatch(/^[0-9a-f]{64}$/);
        expect(rows.results[0]?.token_hash).not.toBe(token);
    });

    it('should reject a state that does not match the cookie', async () => {
        const { cookie } = await start();
        const fetchSpy = mockGoogle(googleClaims(ADMIN));
        const response = await callback('forged-state', cookie);
        expect(response.status).toBe(400);
        expect(fetchSpy).toHaveLength(0);
    });

    it('should reject a tampered or missing state cookie', async () => {
        const { location, cookie } = await start();
        const state = location.searchParams.get('state') ?? '';
        mockGoogle(googleClaims(ADMIN));
        expect((await callback(state, `${cookie}x`)).status).toBe(400);
        expect((await callback(state, '')).status).toBe(400);
    });

    it('should reject an expired state cookie', async () => {
        const { location, cookie } = await start();
        mockGoogle(googleClaims(ADMIN));
        vi.useFakeTimers({ now: Date.now() + 11 * 60_000, toFake: ['Date'] });
        try {
            const response = await callback(location.searchParams.get('state') ?? '', cookie);
            expect(response.status).toBe(400);
        } finally {
            vi.useRealTimers();
        }
    });

    it('should answer 403 without a session for an email outside ADMIN_EMAILS', async () => {
        const { location, cookie } = await start();
        mockGoogle(googleClaims('someone@gmail.com'));
        const response = await callback(location.searchParams.get('state') ?? '', cookie);
        expect(response.status).toBe(403);
        expect(await response.text()).toContain('someone@gmail.com');
        expect(cookiePair(response, '__Host-session')).toBeUndefined();
        const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions').first('n');
        expect(count).toBe(0);
    });

    it('should escape the email shown on the 403 page', async () => {
        const { location, cookie } = await start();
        mockGoogle(googleClaims('<b>x@y.z'));
        const response = await callback(location.searchParams.get('state') ?? '', cookie);
        expect(await response.text()).not.toContain('<b>x@y.z');
    });

    it('should refuse an unverified email even if whitelisted', async () => {
        const { location, cookie } = await start();
        mockGoogle(googleClaims(ADMIN, { email_verified: false }));
        const response = await callback(location.searchParams.get('state') ?? '', cookie);
        expect(response.status).toBe(403);
        expect(cookiePair(response, '__Host-session')).toBeUndefined();
    });

    it('should refuse an id_token issued for another client', async () => {
        const { location, cookie } = await start();
        mockGoogle(googleClaims(ADMIN, { aud: 'someone-else' }));
        const response = await callback(location.searchParams.get('state') ?? '', cookie);
        expect(response.status).toBe(502);
    });

    it('should fail closed when Google rejects the code', async () => {
        const { location, cookie } = await start();
        mockGoogle({}, 400);
        const response = await callback(location.searchParams.get('state') ?? '', cookie);
        expect(response.status).toBe(502);
        expect(cookiePair(response, '__Host-session')).toBeUndefined();
    });

    it('should send the user back home when they cancel on Google', async () => {
        const response = await call('/auth/google/callback?error=access_denied');
        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('/');
    });
});

describe('session guard', () => {
    it('should keep /api/health public', async () => {
        expect((await call('/api/health')).status).toBe(200);
    });

    it('should answer 401 on /api/* without a session', async () => {
        expect((await call('/api/me')).status).toBe(401);
        expect((await call('/api/publishes')).status).toBe(401);
    });

    it('should return the email for a valid session', async () => {
        const response = await call('/api/me', { headers: { cookie: await loginCookie() } });
        expect(await response.json()).toEqual({ email: ADMIN });
    });

    it('should treat an expired session as logged out', async () => {
        const cookie = await loginCookie(ADMIN, Date.now() - SESSION_TTL_MS - 1);
        expect((await call('/api/me', { headers: { cookie } })).status).toBe(401);
    });

    it('should reject a session token that was never issued', async () => {
        const cookie = '__Host-session=not-a-real-token';
        expect((await call('/api/me', { headers: { cookie } })).status).toBe(401);
    });
});

describe('CSRF Origin check', () => {
    const post = async (headers: Record<string, string>) =>
        call('/api/publish', {
            method: 'POST',
            headers: { cookie: await loginCookie(), ...headers },
        });

    it('should reject a mutating request without an Origin header', async () => {
        expect((await post({})).status).toBe(403);
    });

    it('should reject a mutating request from another origin', async () => {
        expect((await post({ origin: 'https://evil.example' })).status).toBe(403);
    });
});

describe('POST /auth/logout', () => {
    it('should delete the session and clear the cookie', async () => {
        const cookie = await loginCookie();
        const response = await call('/auth/logout', {
            method: 'POST',
            headers: { cookie, origin: ORIGIN },
        });
        expect(response.status).toBe(204);
        expect(cookiePair(response, '__Host-session')).toBe('__Host-session=');
        expect((await call('/api/me', { headers: { cookie } })).status).toBe(401);
    });

    it('should refuse a cross-site logout', async () => {
        const cookie = await loginCookie();
        const response = await call('/auth/logout', {
            method: 'POST',
            headers: { cookie, origin: 'https://evil.example' },
        });
        expect(response.status).toBe(403);
        expect((await call('/api/me', { headers: { cookie } })).status).toBe(200);
    });
});
