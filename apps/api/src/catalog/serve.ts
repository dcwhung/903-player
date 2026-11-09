/*
 * 公開 serving（唔使 login）：catalog.json + 圖，由 private R2 經 Worker 出。
 * - Edge cache（Cache API）只存「冇 CORS header」嘅 base response，出門先按 Origin 加，唔會串 origin
 * - 404 唔入 cache、Cache-Control: no-store
 * - CORS 只回 PLAYER_ORIGINS 入面 match 到嘅 origin；一律 Vary: Origin
 */
import { Hono, type Context } from 'hono';
import type { AppEnv } from '../app';
import {
    CATALOG_IMAGE_KEY_PREFIX,
    CATALOG_JSON_KEY,
    CATALOG_JSON_MAX_AGE_SECONDS,
    CATALOG_JSON_PATH,
    HTTP_STATUS,
    IMAGE_FILE_PATTERN,
    IMAGE_MAX_AGE_SECONDS,
} from '../config';
import { csvList } from '../lib/env';

const CATALOG_CACHE_CONTROL = `public, max-age=${CATALOG_JSON_MAX_AGE_SECONDS}`;
const IMAGE_CACHE_CONTROL = `public, max-age=${IMAGE_MAX_AGE_SECONDS}, immutable`;

/** Cache key 一律用 WORKER_ORIGIN（唔理 request 嘅 host / query），publish 時先 purge 得準 */
const cacheKey = (origin: string, key: string): Request => new Request(`${origin}/${key}`);

export const purgeCatalogCache = async (origin: string): Promise<void> => {
    await caches.default.delete(cacheKey(origin, CATALOG_JSON_KEY));
};

const notFound = (): Response =>
    new Response('Not found', {
        status: HTTP_STATUS.notFound,
        headers: { 'cache-control': 'no-store' },
    });

const fromR2 = async (bucket: R2Bucket, key: string, cacheControl: string) => {
    const object = await bucket.get(key);
    if (!object) return undefined;
    const headers = new Headers({ 'cache-control': cacheControl });
    object.writeHttpMetadata(headers);
    headers.set(
        'etag',
        object.customMetadata?.hash ? `"${object.customMetadata.hash}"` : object.httpEtag,
    );
    return new Response(object.body, { headers });
};

/** edge cache → R2（有先寫返 cache）；搵唔到 → undefined */
const baseResponse = async (c: Context<AppEnv>, key: string, cacheControl: string) => {
    const request = cacheKey(c.env.WORKER_ORIGIN, key);
    const cached = await caches.default.match(request);
    if (cached) return cached;
    const response = await fromR2(c.env.CATALOG, key, cacheControl);
    if (response) await caches.default.put(request, response.clone());
    return response;
};

const withCors = (c: Context<AppEnv>, response: Response): Response => {
    const result = new Response(response.body, response);
    const origin = c.req.header('origin');
    if (origin && csvList(c.env.PLAYER_ORIGINS).includes(origin)) {
        result.headers.set('access-control-allow-origin', origin);
    }
    result.headers.append('vary', 'Origin');
    return result;
};

/** If-None-Match 同 ETag 一樣 → 304（照帶 cache / CORS header） */
const conditional = (c: Context<AppEnv>, response: Response): Response => {
    const etag = response.headers.get('etag');
    if (!etag || c.req.header('if-none-match') !== etag) return response;
    return new Response(null, { status: HTTP_STATUS.notModified, headers: response.headers });
};

const serve = async (c: Context<AppEnv>, key: string, cacheControl: string) => {
    const response = await baseResponse(c, key, cacheControl);
    return withCors(c, response ? conditional(c, response) : notFound());
};

export const catalogRoutes = new Hono<AppEnv>();

catalogRoutes.get(CATALOG_JSON_PATH.slice(CATALOG_JSON_PATH.lastIndexOf('/')), (c) =>
    serve(c, CATALOG_JSON_KEY, CATALOG_CACHE_CONTROL),
);

catalogRoutes.get('/img/:file', (c) => {
    const file = c.req.param('file');
    if (!IMAGE_FILE_PATTERN.test(file)) return withCors(c, notFound());
    return serve(c, `${CATALOG_IMAGE_KEY_PREFIX}${file}`, IMAGE_CACHE_CONTROL);
});
