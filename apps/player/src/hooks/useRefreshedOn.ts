import { useState } from 'react';

const sameKeys = (a: readonly unknown[], b: readonly unknown[]): boolean =>
    a.length === b.length && a.every((key, i) => Object.is(key, b[i]));

/**
 * 讀外部狀態（例如 localStorage 進度）並記住，`keys` 任何一個改變先重新讀。
 * `read` 唔需要用到 keys：佢哋只係話幾時資料可能變咗（例如 watchedRevision、轉集）。
 * 咁 progressStore 就唔使為咗 useMemo 嘅 exhaustive-deps 而加冇用嘅參數。
 * 用 render 期間 derive state 嘅寫法（React 文檔建議），唔使 eslint-disable。
 */
export const useRefreshedOn = <T>(read: () => T, keys: readonly unknown[]): T => {
    const [cache, setCache] = useState(() => ({ keys, value: read() }));
    if (sameKeys(cache.keys, keys)) {
        return cache.value;
    }
    const next = { keys, value: read() };
    setCache(next);
    return next.value;
};
