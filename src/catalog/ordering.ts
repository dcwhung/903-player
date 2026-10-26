/* 主頁次序：有寫 order 嘅按 order；冇寫嘅排最後，按 id 排 */
export interface Ordered {
    id: string;
    order: number | undefined;
}

const UNORDERED = Number.POSITIVE_INFINITY;

export const compareOrderThenId = (a: Ordered, b: Ordered): number =>
    (a.order ?? UNORDERED) - (b.order ?? UNORDERED) || a.id.localeCompare(b.id);
