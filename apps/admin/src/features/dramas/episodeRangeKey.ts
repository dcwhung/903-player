/*
 * 集數範圍 key（「6」/「1-5」，同 catalog 排程 rule 嘅 `unlisted` / `episodeDates` key 一樣）→ 集數（S-837）
 */
const RANGE_KEY = /^(\d+)(?:-(\d+))?$/;

/** 「1-3」→ [1, 2, 3]；「6」→ [6]；唔啱格式 → [] */
export const nosOfRangeKey = (key: string): number[] => {
    const match = RANGE_KEY.exec(key);
    if (!match) return [];
    const first = Number(match[1]);
    const last = match[2] === undefined ? first : Number(match[2]);
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
};
