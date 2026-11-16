/*
 * Build 時套用 catalog 嘅 branding.text（App 外觀 plan 2026-11-13）：
 * - manifest name / short_name / description（manifestText）
 * - index.html <title> / meta description / og:title / og:site_name / og:description（injectBrandingText）
 * 冇 branding.text 就保持 index.html / manifest 現有寫死嘅值。runtime 行為唔變（只係 build 時嘅值）。
 * catalog 讀取同 catalogSnapshot 一樣經 runnerImport（Node 直接 import workspace TS 會失敗）。
 */
import type * as Catalog from '@903-player/catalog';
import type { CatalogBranding, CatalogText } from '@903-player/catalog';
import { runnerImport, type Plugin } from 'vite';
import { fetchOk, SNAPSHOT_FETCH_TIMEOUT_MS, withTimeout } from './snapshotFetch.ts';

const LOG_PREFIX = '[branding-text]';
const E2E_MODE = 'e2e';
const BUILD_COMMAND = 'build';
const CATALOG_PACKAGE = '@903-player/catalog';

/** manifest / index.html 冇 branding 時嘅預設（同 vite.config / index.html 現有值一致） */
export const DEFAULT_APP_NAME = '903 Player';

type CatalogModule = Pick<typeof Catalog, 'parseCatalogDocument'>;

export interface LoadBrandingOptions {
    /** catalog.json URL；空 = 功能關住 */
    url: string;
    command: string;
    mode: string;
    loadCatalog?: () => Promise<CatalogModule>;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
}

const runnerCatalog = async (): Promise<CatalogModule> =>
    (await runnerImport<CatalogModule>(CATALOG_PACKAGE, { configFile: false, logLevel: 'error' }))
        .module;

/** production build 先讀 catalog branding；e2e / 本機 / 冇 URL / 任何失敗 → undefined（用內建） */
export const loadBranding = async (
    options: LoadBrandingOptions,
): Promise<CatalogBranding | undefined> => {
    if (options.command !== BUILD_COMMAND || options.mode === E2E_MODE || !options.url)
        return undefined;
    try {
        const fetchImpl = options.fetchImpl ?? fetch;
        const text = await withTimeout(
            async (signal) => (await fetchOk(fetchImpl, options.url, signal)).text(),
            options.timeoutMs ?? SNAPSHOT_FETCH_TIMEOUT_MS,
        );
        const catalog = await (options.loadCatalog ?? runnerCatalog)();
        return catalog.parseCatalogDocument(JSON.parse(text) as unknown).branding;
    } catch (error) {
        console.warn(`${LOG_PREFIX} ${options.url} failed, using the built-in branding`, error);
        return undefined;
    }
};

export interface ManifestText {
    name: string;
    short_name: string;
    description?: string;
}

/** manifest 嘅 name / short_name / description：冇 branding 就只有名（同而家一樣，冇 description） */
export const manifestText = (text: CatalogText | undefined): ManifestText =>
    text
        ? {
              name: text.name,
              short_name: text.shortName ?? text.name,
              description: text.description,
          }
        : { name: DEFAULT_APP_NAME, short_name: DEFAULT_APP_NAME };

const escapeHtml = (value: string): string =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');

/*
 * 改一個 <meta …> 嘅 content（attr 跨行都 match，因為 [^>] 包埋換行）。
 * W-736：replacement 一律用 function，唔係字串 —— 字串會解讀 $' / $& / $1，App 名有 $ 會破壞 HTML
 */
const setMetaContent = (html: string, marker: string, value: string): string =>
    html.replace(/<meta\b[^>]*>/g, (tag) =>
        tag.includes(marker)
            ? tag.replace(/content="[^"]*"/, () => `content="${escapeHtml(value)}"`)
            : tag,
    );

/** index.html 嘅 title / description / og:* 換做 catalog branding 值（HTML escape） */
export const applyBrandingText = (html: string, text: CatalogText): string => {
    let out = html.replace(
        /<title>[^<]*<\/title>/,
        () => `<title>${escapeHtml(text.name)}</title>`,
    );
    out = setMetaContent(out, 'name="description"', text.description);
    out = setMetaContent(out, 'property="og:title"', text.name);
    out = setMetaContent(out, 'property="og:site_name"', text.name);
    out = setMetaContent(out, 'property="og:description"', text.description);
    return out;
};

/** 有 branding.text 先改 index.html；冇就唔郁（enforce pre，趕喺 PWA 注入 manifest link 之前） */
export const injectBrandingText = (text: CatalogText | undefined): Plugin => ({
    name: 'inject-branding-text',
    transformIndexHtml: {
        order: 'pre',
        handler: (html) => (text ? applyBrandingText(html, text) : html),
    },
});
