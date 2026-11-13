/*
 * Prebuild snapshot（Backend Phase 2b-2）：production build 開始時（buildStart）攞最新 publish 嘅 catalog.json
 * 連全部圖，寫去 src/catalog/snapshot/data/（gitignored），由 src/catalog/snapshot/source.ts 包入 bundle：
 * 第一次離線開 app、或者 runtime catalog fetch 唔到時都係最新內容（唔再係愈嚟愈舊嘅 repo library）。
 * - 只喺 command = build、mode ≠ e2e、有 catalog URL 先 fetch（CI 嘅 e2e build 唔會誤 fetch）
 * - 用 player runtime 同一套 validator（parseCatalogDocument + 兩個 registry）驗；圖要 sha256 前 16 hex = 檔名
 * - 先寫暫存 folder，全部成功先 rename；任何一步失敗 → console.warn + 清走，build 照行（用 repo library）
 */
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type * as Catalog from '@903-player/catalog';
import type { CatalogDocument, CatalogEntry, EpisodeBuildOptions } from '@903-player/catalog';
import { runnerImport, type Plugin } from 'vite';
import {
    fetchBytes,
    fetchOk,
    matchesHashName,
    sha256Hex,
    SNAPSHOT_FETCH_TIMEOUT_MS,
    withTimeout,
} from './snapshotFetch.ts';

export { SNAPSHOT_FETCH_TIMEOUT_MS } from './snapshotFetch.ts';
/** 同時下載幾多張圖 */
export const SNAPSHOT_IMAGE_CONCURRENCY = 6;

const LOG_PREFIX = '[catalog-snapshot]';
const E2E_MODE = 'e2e';
const BUILD_COMMAND = 'build';
const CATALOG_PACKAGE = '@903-player/catalog';
const DOCUMENT_FILE = 'catalog.json';
const IMAGE_DIR = 'img';
/** Worker 圖檔名：<sha256 前 16 hex>.<ext>（同 apps/api IMAGE_FILE_PATTERN 一致） */
const IMAGE_NAME_PATTERN = /^([0-9a-f]{16})\.(webp|jpg)$/;

type CatalogModule = Pick<
    typeof Catalog,
    'parseCatalogDocument' | 'documentSource' | 'buildRegistry' | 'buildShowRegistry'
>;

export interface SnapshotOptions {
    /** catalog.json 嘅絕對 URL */
    url: string;
    /** 寫去邊（src/catalog/snapshot/data）；暫存 folder 喺佢隔籬 */
    dir: string;
    episodeOptions: EpisodeBuildOptions;
    catalog: CatalogModule;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    concurrency?: number;
}

export interface SnapshotResult {
    /** catalog.json 全文嘅 sha256 hex（= publish hash = Worker ETag） */
    hash: string;
    generatedAt: string;
    imageCount: number;
}

/** 同 player runtime 一樣：parse + 兩個 registry 都 build 到先算合格 */
const validate = (catalog: CatalogModule, value: unknown, options: EpisodeBuildOptions) => {
    const doc = catalog.parseCatalogDocument(value);
    catalog.buildRegistry(catalog.documentSource(doc, 'dramas'), options);
    catalog.buildShowRegistry(catalog.documentSource(doc, 'shows'));
    return doc;
};

/** 圖 URL 嘅最後一段要係 <hash>.<ext>；same-origin 路徑跟 catalog URL 補返 host */
const imageOf = (url: string, catalogUrl: string) => {
    const absolute = new URL(url, catalogUrl).href;
    const name = absolute.slice(absolute.lastIndexOf('/') + 1);
    if (!IMAGE_NAME_PATTERN.test(name)) throw new Error(`image ${url} is not <hash>.<ext>`);
    return { name, url: absolute };
};

/** 全部圖（同一張圖多個 entry 用都只下載一次）：檔名 → 絕對 URL；首頁 banner 兩張都計（Phase 4） */
const imagesOf = (doc: CatalogDocument, catalogUrl: string): Map<string, string> => {
    const entries = [...doc.shows, ...doc.dramas];
    const bannerUrls = doc.banner ? [doc.banner.standard, doc.banner.long] : [];
    const urls = [...entries.flatMap((entry) => Object.values(entry.images)), ...bannerUrls];
    return new Map(urls.map((url) => imageOf(url, catalogUrl)).map((i) => [i.name, i.url]));
};

/**
 * 每個 worker 輪流攞下一張，同時最多 limit 個。一張失敗就唔再開新嘅（S-793），
 * 但要等已經開咗嘅行完先 reject：唔係 createSnapshot 嘅 rm(tmp) 會同未完嘅 writeFile 競爭，留低 data.tmp/
 */
const runPool = async <T>(items: readonly T[], limit: number, task: (item: T) => Promise<void>) => {
    let next = 0;
    let failure: { error: unknown } | undefined;
    const worker = async () => {
        while (!failure && next < items.length) {
            try {
                await task(items[next++] as T);
            } catch (error) {
                failure ??= { error };
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    if (failure) throw failure.error;
};

const downloadImage = async (
    options: SnapshotOptions,
    tmp: string,
    [name, url]: [string, string],
) => {
    const fetchImpl = options.fetchImpl ?? fetch;
    const timeoutMs = options.timeoutMs ?? SNAPSHOT_FETCH_TIMEOUT_MS;
    const bytes = await fetchBytes(fetchImpl, url, timeoutMs);
    if (!matchesHashName(bytes, IMAGE_NAME_PATTERN.exec(name)?.[1]))
        throw new Error(`image ${name}: content hash does not match the file name`);
    await writeFile(join(tmp, IMAGE_DIR, name), bytes);
};

/** images 同 banner 值（URL）改寫做檔名：source.ts 再換做 Vite asset URL（loadSnapshot） */
const withFileNames = (doc: CatalogDocument, catalogUrl: string): CatalogDocument => {
    const localEntry = (entry: CatalogEntry): CatalogEntry => ({
        ...entry,
        images: Object.fromEntries(
            Object.entries(entry.images).map(([file, url]) => [
                file,
                imageOf(url, catalogUrl).name,
            ]),
        ),
    });
    const fileName = (url: string) => imageOf(url, catalogUrl).name;
    const banner = doc.banner && {
        standard: fileName(doc.banner.standard),
        long: fileName(doc.banner.long),
    };
    return {
        ...doc,
        shows: doc.shows.map(localEntry),
        dramas: doc.dramas.map(localEntry),
        ...(banner ? { banner } : {}),
    };
};

const fetchDocument = async (options: SnapshotOptions) => {
    const fetchImpl = options.fetchImpl ?? fetch;
    const text = await withTimeout(
        async (signal) => (await fetchOk(fetchImpl, options.url, signal)).text(),
        options.timeoutMs ?? SNAPSHOT_FETCH_TIMEOUT_MS,
    );
    const doc = validate(options.catalog, JSON.parse(text) as unknown, options.episodeOptions);
    return { doc, hash: sha256Hex(text) };
};

/** 下載 + 驗證去暫存 folder，全部成功先 rename 做 dir；失敗就清走暫存並 throw */
export const createSnapshot = async (options: SnapshotOptions): Promise<SnapshotResult> => {
    const tmp = `${options.dir}.tmp`;
    try {
        const { doc, hash } = await fetchDocument(options);
        const images = [...imagesOf(doc, options.url)];
        await rm(tmp, { recursive: true, force: true });
        await mkdir(join(tmp, IMAGE_DIR), { recursive: true });
        const limit = options.concurrency ?? SNAPSHOT_IMAGE_CONCURRENCY;
        await runPool(images, limit, (image) => downloadImage(options, tmp, image));
        const json = JSON.stringify(withFileNames(doc, options.url));
        await writeFile(join(tmp, DOCUMENT_FILE), json);
        await rm(options.dir, { recursive: true, force: true });
        await rename(tmp, options.dir);
        return { hash, generatedAt: doc.generatedAt, imageCount: images.length };
    } catch (error) {
        await rm(tmp, { recursive: true, force: true });
        throw error;
    }
};

export interface CatalogSnapshotPluginOptions {
    /** VITE_CATALOG_URL（e2e 嘅同 origin 路徑都會傳入嚟，靠 mode 擋） */
    url: string;
    dir: string;
    episodeOptions: EpisodeBuildOptions;
    /**
     * 預設經 Vite module runner 載入：vite.config 嘅 bundler 會 external 晒 bare import，
     * Node 直接 import workspace 嘅 TS source 會失敗（extensionless import）
     */
    loadCatalog?: () => Promise<CatalogModule>;
    fetchImpl?: typeof fetch;
}

const runnerCatalog = async (): Promise<CatalogModule> =>
    (await runnerImport<CatalogModule>(CATALOG_PACKAGE, { configFile: false, logLevel: 'error' }))
        .module;

const snapshotOnce = async (options: CatalogSnapshotPluginOptions) => {
    try {
        const catalog = await (options.loadCatalog ?? runnerCatalog)();
        const result = await createSnapshot({ ...options, catalog });
        console.log(
            `${LOG_PREFIX} hash ${result.hash} · generatedAt ${result.generatedAt} · ` +
                `${result.imageCount} images`,
        );
    } catch (error) {
        console.warn(`${LOG_PREFIX} ${options.url} failed, using the repo library`, error);
    }
};

/** Vite plugin：buildStart 喺 Vite 掃任何 module（包括 snapshot/source.ts 嘅 glob）之前行完 */
export const catalogSnapshot = (options: CatalogSnapshotPluginOptions): Plugin => {
    let command = '';
    let mode = '';
    return {
        name: 'catalog-snapshot',
        configResolved: (config) => {
            command = config.command;
            mode = config.mode;
        },
        buildStart: async () => {
            if (command !== BUILD_COMMAND) return;
            // 每次 build 都清舊 snapshot（冇 URL / e2e 就係用 repo library，唔好用本機殘留）
            await rm(options.dir, { recursive: true, force: true });
            if (mode === E2E_MODE || !options.url) return;
            await snapshotOnce(options);
        },
    };
};
