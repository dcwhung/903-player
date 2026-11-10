/* entry 樂觀鎖：ETag = "<updated_at>"；每次寫都要新嘅 updated_at（同一 ms 都唔可以撞） */

/** ETag header 值 */
export const etagOf = (updatedAt: string): string => `"${updatedAt}"`;

/** If-Match / If-None-Match 值去引號（容許 W/ 前綴） */
const unquote = (value: string): string => value.trim().replace(/^W\//, '').replace(/^"|"$/g, '');

export const ifMatches = (header: string | undefined, updatedAt: string): boolean =>
    header !== undefined && unquote(header) === updatedAt;

/** If-Match header（冇就 null） */
export const expectedVersion = (header: string | undefined): string | null =>
    header === undefined ? null : unquote(header);

/** 新 updated_at：一定大過舊嗰個（同一 ms 寫兩次就 +1 ms），ETag 先唔會撞 */
export const nextUpdatedAt = (previous: string | undefined, now: Date = new Date()): string => {
    const previousMs = previous === undefined ? Number.NaN : Date.parse(previous);
    const ms = Number.isNaN(previousMs) ? now.getTime() : Math.max(now.getTime(), previousMs + 1);
    return new Date(ms).toISOString();
};
