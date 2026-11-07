/*
 * runtime catalog.json（Backend Phase 1）嘅 SW runtimeCaching：vite.config.ts 用，build 時喺 Node 跑。
 * - catalog.json：NetworkFirst，網絡 CATALOG_SW_NETWORK_TIMEOUT_SECONDS 內冇答（或者離線）就交上次 cache
 * - 同一個 folder（同 host）入面嘅圖：CacheFirst（檔名有 hash，內容唔會變），有數量同日數上限
 * VITE_CATALOG_URL 冇設定 = 一條 route 都唔加，sw.js 同 v1.29 一樣。
 * workbox RegExpRoute：同 origin 嘅 request pattern 喺任何位置 match 都得；跨 origin 一定要由第一個字 match，
 * 所以絕對 URL 用 ^ 錨定，同 origin 路徑（/ 開頭）唔錨定，自然唔會 match 到第二個 host
 */
import { CATALOG_SW_NETWORK_TIMEOUT_SECONDS } from '../src/config/catalogFetch.ts';

const JSON_CACHE = 'catalog-json';
const IMAGE_CACHE = 'catalog-images';
/** 一份 catalog 大約 13 個 folder × 每個最多十幾張圖；留多啲位畀換圖 */
const IMAGE_MAX_ENTRIES = 300;
const SECONDS_PER_DAY = 86_400;
const IMAGE_MAX_AGE_DAYS = 60;
/** 0 = 跨 origin 嘅 <img>（no-cors，opaque response） */
const CACHEABLE_STATUSES = [0, 200];
const IMAGE_EXTENSIONS = '(?:webp|png|jpe?g|avif)';
const OPTIONAL_QUERY = '(?:\\?.*)?$';

export interface CatalogRoute {
    urlPattern: RegExp;
    handler: 'NetworkFirst' | 'CacheFirst';
    options: {
        cacheName: string;
        networkTimeoutSeconds?: number;
        expiration?: { maxEntries: number; maxAgeSeconds: number };
        cacheableResponse?: { statuses: number[] };
    };
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** 絕對 URL 由頭錨定；同 origin 路徑唔錨定（見檔頭） */
const anchorOf = (url: string): string => (url.startsWith('/') ? '' : '^');

/** 冇 query / hash 嘅 URL 同佢所在 folder（最後一個 / 為止） */
const splitUrl = (url: string): { file: string; folder: string } => {
    const file = url.replace(/[?#].*$/, '');
    return { file, folder: file.slice(0, file.lastIndexOf('/') + 1) };
};

export const catalogRuntimeCaching = (catalogUrl: string): CatalogRoute[] => {
    if (!catalogUrl) return [];
    const { file, folder } = splitUrl(catalogUrl);
    const anchor = anchorOf(catalogUrl);
    return [
        {
            urlPattern: new RegExp(`${anchor}${escapeRegExp(file)}${OPTIONAL_QUERY}`),
            handler: 'NetworkFirst',
            options: {
                cacheName: JSON_CACHE,
                networkTimeoutSeconds: CATALOG_SW_NETWORK_TIMEOUT_SECONDS,
            },
        },
        {
            urlPattern: new RegExp(
                `${anchor}${escapeRegExp(folder)}[^?#]+\\.${IMAGE_EXTENSIONS}${OPTIONAL_QUERY}`,
            ),
            handler: 'CacheFirst',
            options: {
                cacheName: IMAGE_CACHE,
                expiration: {
                    maxEntries: IMAGE_MAX_ENTRIES,
                    maxAgeSeconds: IMAGE_MAX_AGE_DAYS * SECONDS_PER_DAY,
                },
                cacheableResponse: { statuses: CACHEABLE_STATUSES },
            },
        },
    ];
};
