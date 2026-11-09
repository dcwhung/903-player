/*
 * Admin session：32 bytes random token 放 cookie，D1 只存 SHA-256（DB 漏咗都冒充唔到）。
 * 過期即當未 login；開新 session 時順手清走過期嘅行
 */
import { SESSION_TOKEN_BYTES, SESSION_TTL_MS } from '../config';
import { randomBase64Url, sha256Hex } from '../lib/crypto';

export const createSession = async (db: D1Database, email: string, now = Date.now()) => {
    const token = randomBase64Url(SESSION_TOKEN_BYTES);
    await db.batch([
        db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
        db
            .prepare('INSERT INTO sessions (token_hash, email, expires_at) VALUES (?, ?, ?)')
            .bind(await sha256Hex(token), email, now + SESSION_TTL_MS),
    ]);
    return token;
};

/** 有效 session 嘅 email；冇 / 過期 → undefined */
export const findSession = async (db: D1Database, token: string, now = Date.now()) => {
    const email = await db
        .prepare('SELECT email FROM sessions WHERE token_hash = ? AND expires_at > ?')
        .bind(await sha256Hex(token), now)
        .first<string>('email');
    return email ?? undefined;
};

export const deleteSession = async (db: D1Database, token: string): Promise<void> => {
    await db
        .prepare('DELETE FROM sessions WHERE token_hash = ?')
        .bind(await sha256Hex(token))
        .run();
};
