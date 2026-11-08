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

export function buildCatalogDocument(options: {
    imageBase: string;
    catalogDir?: string;
    generatedAt?: string;
}): GeneratedCatalog;

export function run(argv: readonly string[], io?: { out?: (text: string) => void }): number;
