/* 編輯頁草稿：同已儲存版本比較（邊啲欄位改咗）、儲存結果、錯誤分類 */
import { UnauthorizedError, ValidationError, VersionConflictError } from '../../api/client';
import { errorMessage } from '../../api/errorMessage';
import type { ImageMap, LoadedEntry, RawDefinition, SaveResult } from '../../api/types';
import { t } from '../../i18n/t';
import { zhHK } from '../../i18n/zh-HK';

export interface Draft {
    definition: RawDefinition;
    images: ImageMap;
}

export type Problem =
    | { type: 'conflict'; at: string }
    /** 401：session 過期，草稿保留，開新分頁重新登入 */
    | { type: 'unauthorized' }
    | { type: 'invalid'; detail: string }
    | { type: 'failed'; message: string };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** 改咗嘅 definition 欄位（圖片當一個欄位） */
export const changedKeys = (saved: Draft, draft: Draft): string[] => {
    const keys = new Set([...Object.keys(saved.definition), ...Object.keys(draft.definition)]);
    const changed = [...keys].filter((key) => !same(saved.definition[key], draft.definition[key]));
    return same(saved.images, draft.images) ? changed : [...changed, 'images'];
};

export const fieldLabelOf = (key: string): string =>
    key in zhHK.fields ? t(`fields.${key as keyof typeof zhHK.fields}`) : t('fields.other');

/** 「● 有未儲存的變更（簡介、主持）」用：重複嘅「其他」只出一次 */
export const dirtyLabels = (keys: readonly string[]): string[] => [
    ...new Set(keys.map(fieldLabelOf)),
];

export const etagOf = (updatedAt: string) => `"${updatedAt}"`;

export const savedEntry = (entry: LoadedEntry, draft: Draft, result: SaveResult): LoadedEntry => ({
    ...entry,
    ...draft,
    draft: result.draft,
    updatedAt: result.updatedAt,
    etag: etagOf(result.updatedAt),
});

export const problemOf = (error: unknown, now: Date = new Date()): Problem => {
    if (error instanceof VersionConflictError) return { type: 'conflict', at: now.toISOString() };
    if (error instanceof UnauthorizedError) return { type: 'unauthorized' };
    if (error instanceof ValidationError) return { type: 'invalid', detail: error.details };
    return { type: 'failed', message: errorMessage(error) };
};

/**
 * 重新掃描結果（server 用已儲存 definition 做 existing）+ 本機未儲存嘅改動：
 * 本機改過嘅欄位保留本機值，其餘用掃描結果
 */
export const mergeRescan = (
    saved: RawDefinition,
    local: RawDefinition,
    scanned: RawDefinition,
): RawDefinition => {
    const edited = Object.keys(local).filter((key) => !same(saved[key], local[key]));
    return { ...scanned, ...Object.fromEntries(edited.map((key) => [key, local[key]])) };
};
