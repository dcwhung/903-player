/*
 * OAuth state + PKCE verifier：/auth/google/start 放入 HMAC 簽名 cookie（SESSION_SECRET），
 * callback 驗簽名、時限、同 query 嘅 state 一致先換 token。Worker 唔使記任何 server state。
 * next（S-809）：login 後返嘅深連結，一齊簽名，callback 先用（開嗰陣再驗一次）
 */
import {
    OAUTH_STATE_BYTES,
    OAUTH_STATE_TTL_SECONDS,
    PKCE_VERIFIER_BYTES,
    SECOND_MS,
} from '../config';
import {
    base64UrlDecode,
    base64UrlEncode,
    hmacSign,
    hmacVerify,
    randomBase64Url,
} from '../lib/crypto';
import { safeNext } from './next';

export interface OAuthState {
    state: string;
    verifier: string;
    /** epoch ms */
    expiresAt: number;
    /** login 後返嘅同站 path（已經過 safeNext） */
    next?: string;
}

export const newOAuthState = (now = Date.now(), next?: string): OAuthState => ({
    state: randomBase64Url(OAUTH_STATE_BYTES),
    verifier: randomBase64Url(PKCE_VERIFIER_BYTES),
    expiresAt: now + OAUTH_STATE_TTL_SECONDS * SECOND_MS,
    ...(next === undefined ? {} : { next }),
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

export interface OpenedOAuthState {
    verifier: string;
    next?: string | undefined;
}

/** 簽名啱、未過期、state 同 callback query 一樣 → verifier（+ next）；否則 undefined */
export const openOAuthState = async (
    secret: string,
    cookie: string | undefined,
    state: string | undefined,
    now = Date.now(),
): Promise<OpenedOAuthState | undefined> => {
    const [payload, signature, extra] = (cookie ?? '').split('.');
    if (!payload || !signature || extra !== undefined) return undefined;
    if (!(await hmacVerify(secret, payload, signature))) return undefined;
    const value = parsePayload(payload);
    if (!value || value.expiresAt <= now || !state || value.state !== state) return undefined;
    return { verifier: value.verifier, next: safeNext(value.next) };
};
