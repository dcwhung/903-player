/*
 * login 後返嘅深連結（S-809）：GET /auth/google/start?next=<path>。
 * 防 open redirect：只收同站 path，同 admin 前端一樣嘅規則 server 再驗一次；唔合規當冇（返 /）
 * - 要 / 開頭，唔可以 // 開頭（protocol-relative = 第二個 host）
 * - 唔可以有 \（瀏覽器當 /，「/\evil.com」會變 //evil.com）或者控制字元（header 注入、tab / 換行會被瀏覽器刪走）
 * - 唔可以係 /auth/*（login 完又行返 login / callback）
 */
const MAX_NEXT_LENGTH = 2048;
/** C0 控制字元（< U+0020）同 DEL（U+007F） */
const SPACE_CODE = 0x20;
const DEL_CODE = 0x7f;
const hasControlCharacter = (text: string): boolean =>
    [...text].some((ch) => {
        const code = ch.charCodeAt(0);
        return code < SPACE_CODE || code === DEL_CODE;
    });
const AUTH_PREFIX = '/auth';

const isAuthPath = (next: string): boolean => {
    const path = next.split(/[?#]/u)[0] ?? '';
    return path === AUTH_PREFIX || path.startsWith(`${AUTH_PREFIX}/`);
};

export const safeNext = (next: unknown): string | undefined => {
    if (typeof next !== 'string' || next.length > MAX_NEXT_LENGTH) return undefined;
    if (!next.startsWith('/') || next.startsWith('//')) return undefined;
    if (next.includes('\\') || hasControlCharacter(next) || isAuthPath(next)) return undefined;
    return next;
};
