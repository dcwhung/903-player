/*
 * catalog.json（v1）：一份文件包晒全部節目同劇集，畀 player 喺 runtime 讀（Phase 1），將來由 backend publish（Phase 2）。
 * 每項 = 一個 folder：definition 同 library 嘅 show.json / drama.json 一模一樣，images 係「檔名 → 絕對 URL」manifest。
 * 呢度只驗文件結構（任何一項唔合格就成份拒絕）；definition 內容由 buildRegistry / buildShowRegistry 驗。
 * 規則同 schemas/catalog.schema.json 一致（document/catalogSchema.node.test.ts 鎖住）
 */
import type { Folder, FolderSource } from '../core/folderSource';
import { ID_PATTERN } from '../core/reader';

/** 唯一識得嘅版本；唔識嘅版本成份拒絕（player fallback 內建資料） */
export const CATALOG_SCHEMA_VERSION = 1;

/** 錯誤 message 前綴 + documentSource 嘅 Folder.source */
const DOCUMENT_NAME = 'catalog.json';

export type CatalogKind = 'shows' | 'dramas';
const KINDS: readonly CatalogKind[] = ['shows', 'dramas'];

export interface CatalogEntry {
    /** folder 名 = id = route param */
    id: string;
    /** 同 show.json / drama.json 一樣，未驗證 */
    definition: Readonly<Record<string, unknown>>;
    /** 檔名（可以有 sub-folder，例如 arcs/season-1/disc.webp）→ 絕對 URL */
    images: Readonly<Record<string, string>>;
}

export interface CatalogDocument {
    schemaVersion: typeof CATALOG_SCHEMA_VERSION;
    /** ISO 8601 時間（要有時區） */
    generatedAt: string;
    shows: readonly CatalogEntry[];
    dramas: readonly CatalogEntry[];
}

export class CatalogDocumentError extends Error {
    override readonly name = 'CatalogDocumentError';
}

/** ISO 8601 日期時間，一定要有時區（Z 或 ±hh:mm） */
const DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
/** 圖檔名：相對 folder 嘅路徑，唔准開頭 /、唔准 . / .. 段、唔准 backslash */
const IMAGE_FILE_PATTERN = /^(?!.*(^|\/)\.\.?(\/|$))[^/\\]+(\/[^/\\]+)*$/;
/** 同 origin 嘅絕對路徑：/ 開頭但唔係 //（protocol-relative 會變第二個 host） */
const SAME_ORIGIN_PATH_PATTERN = /^\/(?!\/)/;
/** https + 最少一個字嘅 host（package 唔用 DOM 嘅 URL；同 schema 用同一條 pattern） */
const HTTPS_URL_PATTERN = /^https:\/\/[^/?#\s]+([/?#].*)?$/;

const fail = (path: string, message: string): never => {
    throw new CatalogDocumentError(`${DOCUMENT_NAME}: ${path} ${message}`);
};

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const readRecord = (value: unknown, path: string): Raw =>
    isRecord(value) ? value : fail(path, 'must be an object');

/** https 絕對 URL（要有 host），或者同 origin 嘅絕對路徑 */
export const isCatalogImageUrl = (url: string): boolean =>
    SAME_ORIGIN_PATH_PATTERN.test(url) || HTTPS_URL_PATTERN.test(url);

const isDateTime = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    const day = DATE_TIME_PATTERN.exec(value)?.[1];
    // Date.parse 會將 2 月 30 號滾去 3 月：用 UTC 日子對返先算存在
    return day !== undefined && new Date(`${day}T00:00:00Z`).toISOString().startsWith(day);
};

const readImages = (value: unknown, path: string): Record<string, string> => {
    const raw = readRecord(value, path);
    Object.entries(raw).forEach(([file, url]) => {
        if (!IMAGE_FILE_PATTERN.test(file)) fail(path, `has an invalid file name "${file}"`);
        if (typeof url !== 'string' || !isCatalogImageUrl(url))
            fail(`${path}["${file}"]`, 'must be an https URL or a same-origin absolute path');
    });
    return raw as Record<string, string>;
};

const readEntry = (value: unknown, path: string): CatalogEntry => {
    const raw = readRecord(value, path);
    const { id } = raw;
    if (typeof id !== 'string' || !ID_PATTERN.test(id))
        fail(`${path}.id`, `must match ${ID_PATTERN.toString()}`);
    return {
        id: id as string,
        definition: readRecord(raw.definition, `${path}.definition`),
        images: readImages(raw.images, `${path}.images`),
    };
};

const readEntries = (raw: Raw, kind: CatalogKind): CatalogEntry[] => {
    const value = raw[kind];
    if (!Array.isArray(value) || value.length === 0) fail(kind, 'must be a non-empty list');
    const entries = (value as unknown[]).map((item, i) => readEntry(item, `${kind}[${i}]`));
    const ids = new Set<string>();
    entries.forEach(({ id }) => {
        if (ids.has(id)) fail(kind, `has a duplicate id ${id}`);
        ids.add(id);
    });
    return entries;
};

/** 驗 catalog.json 結構：任何一項唔合格就 throw CatalogDocumentError（成份拒絕） */
export const parseCatalogDocument = (value: unknown): CatalogDocument => {
    const raw = readRecord(value, 'document');
    if (raw.schemaVersion !== CATALOG_SCHEMA_VERSION)
        fail('schemaVersion', `must be ${CATALOG_SCHEMA_VERSION}`);
    if (!isDateTime(raw.generatedAt))
        fail('generatedAt', 'must be an ISO 8601 date-time with a time zone');
    const [shows, dramas] = KINDS.map((kind) => readEntries(raw, kind));
    return {
        schemaVersion: CATALOG_SCHEMA_VERSION,
        generatedAt: raw.generatedAt as string,
        shows: shows ?? [],
        dramas: dramas ?? [],
    };
};

const toFolder =
    (kind: CatalogKind) =>
    (entry: CatalogEntry): Folder => ({
        id: entry.id,
        source: `${DOCUMENT_NAME}: ${kind}/${entry.id}`,
        definition: entry.definition,
        images: entry.images,
    });

/**
 * catalog.json 嘅一類（shows / dramas）→ FolderSource：registry 用法同 build time 嘅 foldersFromGlobs 一樣，
 * 「圖檔喺 folder 入面」變成「manifest 有列出」，圖 URL 原封不動交畀 <img src>
 */
export const documentSource = (doc: CatalogDocument, kind: CatalogKind): FolderSource => ({
    folders: () => doc[kind].map(toFolder(kind)),
});
