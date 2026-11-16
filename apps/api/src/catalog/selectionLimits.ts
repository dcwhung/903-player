/*
 * 選擇發佈 request 嘅上限（S-980）：唔畀人塞超大 body / key，422 回應亦唔會原封不動送返大量 key
 */

/** content 上限：待辦行唔會多過呢個數，免得有人塞大 array */
export const MAX_CONTENT_KEYS = 500;

/** 單一 key 上限（`<kind>/<劇 ID>[/<短篇 ID>]`，正常唔過 100 字元） */
export const MAX_SELECTION_KEY_LENGTH = 200;

/** 422 最多送返幾多個未知 key（admin 只用嚟提示頁面過時） */
export const MAX_REPORTED_UNKNOWN_KEYS = 20;

/** POST /api/publish body 上限：selection 最多 500 個 ≤ 200 字元 key，64 KB 綽綽有餘 */
export const PUBLISH_BODY_LIMIT_BYTES = 64 * 1024;

/** `<kind>/<劇 ID>[/<短篇 ID>]`：每段唔可以空、唔准空白（ID 本身由 todoKey 決定，呢度只驗形狀） */
const SELECTION_KEY_PATTERN = /^[a-zA-Z]+(?:\/[^/\s]+){1,2}$/;

export const isSelectionKey = (key: unknown): key is string =>
    typeof key === 'string' &&
    key.length <= MAX_SELECTION_KEY_LENGTH &&
    SELECTION_KEY_PATTERN.test(key);
