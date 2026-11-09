// @vitest-environment node
import { CATALOG_SW_NETWORK_TIMEOUT_SECONDS } from '../src/config/catalogFetch';
import { catalogRuntimeCaching } from './catalogCaching';

const ORIGIN = 'http://localhost:4173';

/** workbox RegExpRoute：同 origin 嘅 request 任何位置 match 都得；跨 origin 一定要由 index 0 開始 match */
const routeMatches = (pattern: RegExp, href: string): boolean => {
    const match = pattern.exec(href);
    if (!match) return false;
    return new URL(href).origin === ORIGIN || match.index === 0;
};

const handlerFor = (url: string, href: string) =>
    catalogRuntimeCaching(url).find((route) => routeMatches(route.urlPattern, href))?.handler;

describe('catalogRuntimeCaching', () => {
    it('should add no route when the catalog URL is not set', () => {
        expect(catalogRuntimeCaching('')).toEqual([]);
    });

    it('should fetch catalog.json network first with the SW timeout', () => {
        const [json] = catalogRuntimeCaching('https://cdn.example.com/v1/catalog.json');
        expect(json?.handler).toBe('NetworkFirst');
        expect(json?.options.networkTimeoutSeconds).toBe(CATALOG_SW_NETWORK_TIMEOUT_SECONDS);
    });

    it.each<[string, string, string | undefined]>([
        ['catalog.json', 'https://cdn.example.com/v1/catalog.json', 'NetworkFirst'],
        [
            'catalog.json with a query',
            'https://cdn.example.com/v1/catalog.json?t=1',
            'NetworkFirst',
        ],
        ['an image beside it', 'https://cdn.example.com/v1/dramas/golden/tile.webp', 'CacheFirst'],
        ['an image on another host', 'https://other.example.com/v1/dramas/tile.webp', undefined],
        ['an image outside the folder', 'https://cdn.example.com/v2/tile.webp', undefined],
        ['an R2 audio file', 'https://cdn.example.com/v1/golden/01.m4a', undefined],
        ['the same path on another host', 'https://evil.example/v1/catalog.json', undefined],
    ])('absolute URL: should route %s', (_label, href, handler) => {
        expect(handlerFor('https://cdn.example.com/v1/catalog.json', href)).toBe(handler);
    });

    it.each<[string, string, string | undefined]>([
        ['catalog.json', `${ORIGIN}/903-player/e2e-catalog/catalog.json`, 'NetworkFirst'],
        ['an image', `${ORIGIN}/903-player/e2e-catalog/dramas/x/tile.webp`, 'CacheFirst'],
        ['an app asset', `${ORIGIN}/903-player/assets/index-abc.js`, undefined],
        [
            'the path on another host',
            'https://evil.example/903-player/e2e-catalog/a.webp',
            undefined,
        ],
    ])('same-origin path: should route %s', (_label, href, handler) => {
        expect(handlerFor('/903-player/e2e-catalog/catalog.json', href)).toBe(handler);
    });

    // S-763：Backend Phase 2a Worker layout（apps/api）：圖喺 catalog.json 隔籬嘅 img/ 底下
    it('should cache the Worker images next to catalog.json', () => {
        const worker = 'https://903-player-api.example.workers.dev/catalog/v1/';
        expect(handlerFor(`${worker}catalog.json`, `${worker}img/0123456789abcdef.webp`)).toBe(
            'CacheFirst',
        );
        expect(handlerFor(`${worker}catalog.json`, `${worker}img/0123456789abcdef.jpg`)).toBe(
            'CacheFirst',
        );
        expect(handlerFor(`${worker}catalog.json`, `${worker}catalog.json`)).toBe('NetworkFirst');
    });

    // S-764：<img crossorigin>（Worker 有 CORS）→ 唔再 cache opaque（0），錯誤 response 唔會留 60 日
    it('should cap the image cache and keep only real 200 responses', () => {
        const images = catalogRuntimeCaching('https://cdn.example.com/catalog.json')[1];
        expect(images?.options.expiration?.maxEntries).toBeGreaterThan(0);
        expect(images?.options.expiration?.maxAgeSeconds).toBeGreaterThan(0);
        expect(images?.options.cacheableResponse?.statuses).toEqual([200]);
    });
});
