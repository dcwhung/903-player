/*
 * buildCatalogJson.mjs 嘅型別（只畀 repo 入面嘅 TypeScript test 用）。
 */
export const CATALOG_SCHEMA_VERSION: 1;

export interface GeneratedCatalogEntry {
    id: string;
    definition: Record<string, unknown>;
    images: Record<string, string>;
}

export interface GeneratedCatalog {
    schemaVersion: 1;
    generatedAt: string;
    shows: GeneratedCatalogEntry[];
    dramas: GeneratedCatalogEntry[];
}

export interface ScannedImage {
    /** folder 入面嘅相對檔名（/ 分隔），即係 definition 引用嘅名 */
    file: string;
    /** 本機絕對路徑 */
    path: string;
}

export interface ScannedEntry {
    id: string;
    definition: Record<string, unknown>;
    images: ScannedImage[];
}

export interface ScannedLibrary {
    shows: ScannedEntry[];
    dramas: ScannedEntry[];
}

export function scanLibrary(options?: { catalogDir?: string }): ScannedLibrary;

export function buildCatalogDocument(options: {
    imageBase: string;
    catalogDir?: string;
    generatedAt?: string;
}): GeneratedCatalog;

export function run(argv: readonly string[], io?: { out?: (text: string) => void }): number;
