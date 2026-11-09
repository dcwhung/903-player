/*
 * OAuth state + PKCE verifier：/auth/google/start 放入 HMAC 簽名 cookie（SESSION_SECRET），
 * callback 驗簽名、時限、同 query 嘅 state 一致先換 token。Worker 唔使記任何 server state
 */
import { OAUTH_STATE_BYTES, OAUTH_STATE_TTL_SECONDS, PKCE_VERIFIER_BYTES } from '../config';
import {
    base64UrlDecode,
    base64UrlEncode,
    hmacSign,
    hmacVerify,
    randomBase64Url,
} from '../lib/crypto';

const SECOND_MS = 1000;

export interface OAuthState {
    state: string;
    verifier: string;
    /** epoch ms */
    expiresAt: number;
}

export const newOAuthState = (now = Date.now()): OAuthState => ({
    state: randomBase64Url(OAUTH_STATE_BYTES),
    verifier: randomBase64Url(PKCE_VERIFIER_BYTES),
    expiresAt: now + OAUTH_STATE_TTL_SECONDS * SECOND_MS,
});

/** cookie 值：<base64url(JSON)>.<HMAC> */
export const sealOAuthState = async (secret: string, value: OAuthState): Promise<string> => {
    const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(value)));
    return `${payload}.${await hmacSign(secret, payload)}`;
};

const parsePayload = (payload: string): OAuthState | undefined => {
    try {
        const value = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as OAuthState;
        return typeof value.state === 'string' && typeof value.verifier === 'string'
            ? value
            : undefined;
    } catch {
        return undefined;
    }
};

/** 簽名啱、未過期、state 同 callback query 一樣 → verifier；否則 undefined */
export const openOAuthState = async (
    secret: string,
    cookie: string | undefined,
    state: string | undefined,
    now = Date.now(),
): Promise<string | undefined> => {
    const [payload, signature, extra] = (cookie ?? '').split('.');
    if (!payload || !signature || extra !== undefined) return undefined;
    if (!(await hmacVerify(secret, payload, signature))) return undefined;
    const value = parsePayload(payload);
    if (!value || value.expiresAt <= now || !state || value.state !== state) return undefined;
    return value.verifier;
};
