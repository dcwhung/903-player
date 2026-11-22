/*
 * importLibrary.mjs 嘅型別（只畀 scripts/importLibrary.test.ts 用）
 */
import type { ScannedLibrary } from '../../player/scripts/buildCatalogJson.mjs';

export interface ImportEntry {
    kind: 'shows' | 'dramas';
    id: string;
    definition: Record<string, unknown>;
    /** 檔名 → R2 圖檔名（<hash>.<ext>） */
    images: Record<string, string>;
}

export interface ImportAsset {
    /** SHA-256 前 16 hex */
    hash: string;
    /** R2 key：catalog/v1/img/<hash>.<ext> */
    key: string;
    path: string;
    contentType: string;
    bytes: number;
}

export interface ImportPlan {
    entries: ImportEntry[];
    assets: ImportAsset[];
}

export function planImport(library: ScannedLibrary): ImportPlan;

/** overwrite：D1 已有嘅 entries 行畀 repo 版本蓋過（預設 false = 只加未有嘅行） */
export function importSql(
    plan: ImportPlan,
    options?: { now?: string; overwrite?: boolean },
): string;

/** D1 entries 行（只用到比較嗰幾欄） */
export interface ExistingEntryRow {
    kind: string;
    id: string;
    definition: string;
    images: string;
}

export interface EntryCounts {
    /** D1 冇，會 insert */
    missing: number;
    /** D1 有但同 repo 唔同：預設保留，--overwrite 先蓋過 */
    changed: number;
    unchanged: number;
}

export function countEntries(
    entries: readonly ImportEntry[],
    existingRows: readonly ExistingEntryRow[],
): EntryCounts;

export function uploadCommands(
    assets: readonly ImportAsset[],
    mode: 'local' | 'remote',
): string[][];

export interface ExecResult {
    status: number;
    stdout: string;
}

export function run(
    argv: readonly string[],
    io?: { out?: (text: string) => void; exec?: (args: string[]) => ExecResult },
): Promise<number>;
