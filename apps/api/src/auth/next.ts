/*
 * login 後返嘅深連結（S-809）：GET /auth/google/start?next=<path>。
 * 防 open redirect：只收同站 path，同 admin 前端一樣嘅規則 server 再驗一次；唔合規當冇（返 /）
 * - 要 / 開頭，唔可以 // 開頭（protocol-relative = 第二個 host）
 * - 唔可以有 \（瀏覽器當 /，「/\evil.com」會變 //evil.com）或者控制字元（header 注入、tab / 換行會被瀏覽器刪走）
 * - 唔可以係 /auth/*（login 完又行返 login / callback）
 * - path 唔可以有 dot-segment（. / ..，包括 %2e）：瀏覽器會 normalise，/x/../auth/… 一樣行返 /auth（S-825）
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

/** query / hash 之前嘅 path（dot-segment 同 /auth 只睇呢段） */
const pathOf = (next: string): string => next.split(/[?#]/u)[0] ?? '';

const isAuthPath = (next: string): boolean => {
    const path = pathOf(next);
    return path === AUTH_PREFIX || path.startsWith(`${AUTH_PREFIX}/`);
};

/** WHATWG URL：%2e（大細楷）喺 path segment 入面同 . 一樣當 dot-segment */
const ENCODED_DOT = /%2e/giu;
const DOT_SEGMENTS: ReadonlySet<string> = new Set(['.', '..']);

const hasDotSegment = (next: string): boolean =>
    pathOf(next)
        .split('/')
        .some((segment) => DOT_SEGMENTS.has(segment.replace(ENCODED_DOT, '.')));

export const safeNext = (next: unknown): string | undefined => {
    if (typeof next !== 'string' || next.length > MAX_NEXT_LENGTH) return undefined;
    if (!next.startsWith('/') || next.startsWith('//')) return undefined;
    if (next.includes('\\') || hasControlCharacter(next)) return undefined;
    if (hasDotSegment(next) || isAuthPath(next)) return undefined;
    return next;
};
