/*
 * 確認發佈頁版本守衛（AU-021）：GET /api/changes 回 fingerprint =「而家撳發佈會出嘅內容」，
 * admin 撳發佈時帶返佢（POST /api/publish body.fingerprint）；server 喺同一個 request 用啱啱由 D1 砌好、
 * 驗過嘅 document 再計一次，唔同（中間有人儲存 / 發佈過）→ 412、乜都唔寫。
 * 冇帶 fingerprint = 舊行為（舊 admin、還原、其他 caller 唔受影響）
 */
import { sha256Hex } from '../lib/crypto';
import { SelectionError } from './selection';

export class StaleFingerprintError extends Error {
    override readonly name = 'StaleFingerprintError';

    constructor() {
        super('stale publish confirmation');
    }
}

/** 未發佈過（冇 base） */
const NO_BASE = 0;

/** 除 generatedAt 外嘅內容（每次砌 document 都唔同，唔計；同 publish.ts sameContent 一樣） */
const contentOf = (json: string): string =>
    JSON.stringify({ ...(JSON.parse(json) as Record<string, unknown>), generatedAt: null });

/** `<最新 ok publish id；冇 = 0>.<sha256(會發佈嘅 catalog.json，唔計 generatedAt)>` */
export const publishFingerprint = async (base: number | null, json: string): Promise<string> =>
    `${base ?? NO_BASE}.${await sha256Hex(contentOf(json))}`;

/** body.fingerprint：冇 = undefined（唔檢查）；有就要係字串 */
export const parseFingerprint = (value: unknown): string | undefined => {
    if (value === undefined) return undefined;
    if (typeof value !== 'string') throw new SelectionError('fingerprint must be a string');
    return value;
};

/** 有帶 fingerprint 而同而家會發佈嘅內容對唔上 → throw（caller 回 412，未寫任何嘢） */
export const assertFreshFingerprint = async (
    expected: string | undefined,
    current: { base: number | null; json: string },
): Promise<void> => {
    if (expected === undefined) return;
    if (expected !== (await publishFingerprint(current.base, current.json)))
        throw new StaleFingerprintError();
};
