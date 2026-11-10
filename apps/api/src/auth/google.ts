/*
 * Google OAuth（server-side Authorization Code + PKCE）：
 * id_token 係 Worker 直接經 TLS 由 Google token endpoint 攞（OIDC Core 3.1.3.7），所以唔使驗 JWT 簽名，
 * 但照驗 iss / aud，防止攞錯 client 嘅 token
 */
import {
    GOOGLE_AUTH_URL,
    GOOGLE_ISSUERS,
    GOOGLE_SCOPE,
    GOOGLE_TOKEN_URL,
    OAUTH_CALLBACK_PATH,
} from '../config';
import type { Env } from '../env';
import { base64UrlDecode, sha256Base64Url } from '../lib/crypto';

export interface GoogleIdentity {
    email: string;
    emailVerified: boolean;
}

export class GoogleAuthError extends Error {
    override readonly name = 'GoogleAuthError';
}

const redirectUri = (env: Env): string => new URL(OAUTH_CALLBACK_PATH, env.WORKER_ORIGIN).href;

export const authorizationUrl = async (
    env: Env,
    { state, verifier, selectAccount }: { state: string; verifier: string; selectAccount: boolean },
): Promise<string> => {
    const url = new URL(GOOGLE_AUTH_URL);
    url.search = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri(env),
        response_type: 'code',
        scope: GOOGLE_SCOPE,
        state,
        code_challenge: await sha256Base64Url(verifier),
        code_challenge_method: 'S256',
        ...(selectAccount ? { prompt: 'select_account' } : {}),
    }).toString();
    return url.href;
};

/** 網絡錯 / 回應唔係 JSON 都當 Google login 失敗（502），唔好變 500（S-770） */
const fetchTokenEndpoint = async (body: URLSearchParams): Promise<unknown> => {
    let response: Response;
    try {
        response = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body,
        });
    } catch (error) {
        throw new GoogleAuthError(`token endpoint unreachable: ${String(error)}`);
    }
    if (!response.ok) throw new GoogleAuthError(`token endpoint HTTP ${response.status}`);
    return response.json().catch(() => {
        throw new GoogleAuthError('token endpoint returned invalid JSON');
    });
};

const requestTokens = (env: Env, code: string, verifier: string): Promise<unknown> =>
    fetchTokenEndpoint(
        new URLSearchParams({
            code,
            code_verifier: verifier,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri(env),
            grant_type: 'authorization_code',
        }),
    );

const decodeClaims = (idToken: unknown): Record<string, unknown> => {
    const payload = typeof idToken === 'string' ? idToken.split('.')[1] : undefined;
    if (!payload) throw new GoogleAuthError('no id_token');
    try {
        const json = new TextDecoder().decode(base64UrlDecode(payload));
        return JSON.parse(json) as Record<string, unknown>;
    } catch {
        throw new GoogleAuthError('id_token payload is not base64url JSON');
    }
};

/** code + verifier → email；token endpoint 錯 / id_token 唔係俾我哋 → GoogleAuthError */
export const exchangeCode = async (env: Env, code: string, verifier: string) => {
    const tokens = (await requestTokens(env, code, verifier)) as { id_token?: unknown };
    const claims = decodeClaims(tokens.id_token);
    if (!GOOGLE_ISSUERS.includes(String(claims.iss))) throw new GoogleAuthError('bad issuer');
    if (claims.aud !== env.GOOGLE_CLIENT_ID) throw new GoogleAuthError('bad audience');
    if (typeof claims.email !== 'string') throw new GoogleAuthError('no email claim');
    const identity: GoogleIdentity = {
        email: claims.email,
        emailVerified: claims.email_verified === true,
    };
    return identity;
};
