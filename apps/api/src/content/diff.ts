/* 兩份 JSON 嘅結構 diff（scan 回 admin 覆核用）：逐個 key / index 比，只列有變嘅葉 */

export interface DiffEntry {
    /** 例如 arcs[0].episodes */
    path: string;
    /** 冇 = 新加 */
    before?: unknown;
    /** 冇 = 刪咗 */
    after?: unknown;
}

type Container = Record<string, unknown> | unknown[];

const isContainer = (value: unknown): value is Container =>
    typeof value === 'object' && value !== null;

const sameKind = (a: Container, b: Container): boolean => Array.isArray(a) === Array.isArray(b);

const childPath = (path: string, key: string, isArray: boolean): string =>
    isArray ? `${path}[${key}]` : path === '' ? key : `${path}.${key}`;

const leaf = (path: string, before: unknown, after: unknown): DiffEntry => ({
    path,
    ...(before === undefined ? {} : { before }),
    ...(after === undefined ? {} : { after }),
});

const keysOf = (a: Container, b: Container): string[] => [
    ...new Set([...Object.keys(a), ...Object.keys(b)]),
];

/** before → after 有變嘅位置（key 次序唔算變） */
export const jsonDiff = (before: unknown, after: unknown, path = ''): DiffEntry[] => {
    if (isContainer(before) && isContainer(after) && sameKind(before, after)) {
        const isArray = Array.isArray(before);
        const record = (c: Container) => c as Record<string, unknown>;
        return keysOf(before, after).flatMap((key) =>
            jsonDiff(record(before)[key], record(after)[key], childPath(path, key, isArray)),
        );
    }
    if (before === after) return [];
    return [leaf(path, before, after)];
};
