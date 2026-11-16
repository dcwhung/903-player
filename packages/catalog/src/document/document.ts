/*
 * catalog.json（v1）：一份文件包晒全部節目同劇集，畀 player 喺 runtime 讀（Phase 1），將來由 backend publish（Phase 2）。
 * 每項 = 一個 folder：definition 同 library 嘅 show.json / drama.json 一模一樣，images 係「檔名 → 絕對 URL」manifest。
 * 選填 banner = 首頁 banner 兩張圖（窄 + 闊，缺一張成份拒絕）；選填 branding = App 圖示 + 名稱與簡介（branding.ts）。
 * 呢度只驗文件結構（任何一項唔合格就成份拒絕）；definition 內容由 buildRegistry / buildShowRegistry 驗。
 * 規則同 schemas/catalog.schema.json 一致（document/catalogSchema.node.test.ts 鎖住）
 */
import type { Folder, FolderSource } from '../core/folderSource';
import { ID_PATTERN } from '../core/reader';
import { readBranding, type CatalogBranding } from './branding';
import {
    DOCUMENT_NAME,
    fail,
    readImageUrl,
    readKnownKeys,
    readRecord,
    type AssetRef,
    type Raw,
} from './fields';

export { CatalogDocumentError, isCatalogImageUrl, type AssetRef } from './fields';

/** 唯一識得嘅版本；唔識嘅版本成份拒絕（player fallback 內建資料） */
export const CATALOG_SCHEMA_VERSION = 1;

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

/** 首頁 banner：窄版 1200×517 + 闊版 2000×400（ASSET_DIMENSIONS），兩張一齊換 */
export interface CatalogBanner {
    standard: AssetRef;
    long: AssetRef;
}

export interface CatalogDocument {
    schemaVersion: typeof CATALOG_SCHEMA_VERSION;
    /** ISO 8601 時間（要有時區） */
    generatedAt: string;
    shows: readonly CatalogEntry[];
    dramas: readonly CatalogEntry[];
    /** 選填（schemaVersion 唔升，舊 player 忽略）；冇 = player 用內建圖 */
    banner?: CatalogBanner;
    /** 選填（同 banner 一樣唔升 schemaVersion）；冇 = player 用 repo 內建 icon / 名稱 */
    branding?: CatalogBranding;
}

/** ISO 8601 日期時間，一定要有時區（Z 或 ±hh:mm） */
const DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
/** 圖檔名：相對 folder 嘅路徑，唔准開頭 /、唔准 . / .. 段、唔准 backslash */
const IMAGE_FILE_PATTERN = /^(?!.*(^|\/)\.\.?(\/|$))[^/\\]+(\/[^/\\]+)*$/;
const isDateTime = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    const day = DATE_TIME_PATTERN.exec(value)?.[1];
    // Date.parse 會將 2 月 30 號滾去 3 月：用 UTC 日子對返先算存在
    return day !== undefined && new Date(`${day}T00:00:00Z`).toISOString().startsWith(day);
};

const BANNER_KEYS: readonly (keyof CatalogBanner)[] = ['standard', 'long'];

/** banner 兩張都要、唔准多出 key（打錯字會靜靜雞冇 banner） */
const readBanner = (value: unknown): CatalogBanner => {
    const raw = readKnownKeys(value, 'banner', BANNER_KEYS);
    return {
        standard: readImageUrl(raw.standard, 'banner.standard'),
        long: readImageUrl(raw.long, 'banner.long'),
    };
};

const readImages = (value: unknown, path: string): Record<string, string> => {
    const raw = readRecord(value, path);
    Object.entries(raw).forEach(([file, url]) => {
        if (!IMAGE_FILE_PATTERN.test(file)) fail(path, `has an invalid file name "${file}"`);
        readImageUrl(url, `${path}["${file}"]`);
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
        ...(raw.banner === undefined ? {} : { banner: readBanner(raw.banner) }),
        ...(raw.branding === undefined ? {} : { branding: readBranding(raw.branding) }),
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
