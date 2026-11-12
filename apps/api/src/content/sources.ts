/*
 * R2 原圖（Phase 4 封面編輯器；admin 開劇集編輯頁 / 掃描後自動 call，slot 冇圖就自動裁切上載）：
 * - GET /api/dramas/:id/sources：即場掃 AUDIO <audio.folder>/（= 最新掃描結果），回劇集層同每個短篇嘅
 *   「cd cover」/「cover photo」key；唔寫 D1，draft 劇都得
 * - GET /api/r2-source?key=…：代讀原圖。key 一定要係某套 r2 劇最新掃描結果嘅 cdCover / coverPhoto
 *   （白名單由同一個掃描砌，唔收任意 key，防 path traversal / 讀錄音）；大小上限 R2_SOURCE_MAX_BYTES、
 *   只准圖片 MIME；ETag + If-None-Match → 304（重複 call 唔使再傳）。
 * 已經過 same-origin + session 守門（GET 唔使 same-origin）
 */
import { scanListing, type ArcScan } from '@903-player/catalog';
import { Hono, type Context } from 'hono';
import { r2FolderOf } from '../admin/rescan';
import type { AppEnv } from '../app';
import {
    HTTP_STATUS,
    R2_SOURCE_CACHE_CONTROL,
    R2_SOURCE_CONTENT_TYPES,
    R2_SOURCE_MAX_BYTES,
} from '../config';
import { getEntry, listStoredEntries } from '../catalog/store';
import { badTarget, errorResponse, isRecord, targetOf, type Json } from './http';
import { listingFromR2 } from './r2Listing';

export const sourceRoutes = new Hono<AppEnv>();

const KEY_SEPARATOR = '/';

/** 一層（劇集 / 短篇）嘅原圖 key；冇就 null */
interface CoverKeys {
    cdCover: string | null;
    coverPhoto: string | null;
}

export interface DramaSources extends CoverKeys {
    folder: string;
    arcs: (CoverKeys & { name: string; id: string | null })[];
}

const keyOf = (prefix: string, file: string | undefined): string | null =>
    file === undefined ? null : `${prefix}${KEY_SEPARATOR}${file}`;

const coverKeys = (prefix: string, scan: ArcScan): CoverKeys => ({
    cdCover: keyOf(prefix, scan.cdCover),
    coverPhoto: keyOf(prefix, scan.coverPhoto),
});

/** definition.arcs：短篇名 → id（對唔到嘅短篇資料夾 = 未入 definition，id null） */
const arcIdsOf = (definition: Json): Map<string, string> =>
    new Map(
        (Array.isArray(definition.arcs) ? definition.arcs.filter(isRecord) : [])
            .filter((arc) => typeof arc.name === 'string' && typeof arc.id === 'string')
            .map((arc) => [arc.name as string, arc.id as string]),
    );

/** 即場掃 AUDIO <folder>/：劇集層 + 每個短篇嘅 cd cover / cover photo key */
export const scanSources = async (
    bucket: R2Bucket,
    folder: string,
    definition: Json,
): Promise<DramaSources> => {
    const scan = scanListing(await listingFromR2(bucket, folder));
    const arcIds = arcIdsOf(definition);
    return {
        folder,
        ...coverKeys(folder, scan),
        arcs: scan.arcs.map((arc) => ({
            name: arc.name,
            id: arcIds.get(arc.name) ?? null,
            ...coverKeys(`${folder}${KEY_SEPARATOR}${arc.rawName}`, arc),
        })),
    };
};

/** 白名單：全部非 null 嘅 cdCover / coverPhoto key */
const allowedKeys = ({ cdCover, coverPhoto, arcs }: DramaSources): Set<string> =>
    new Set(
        [cdCover, coverPhoto, ...arcs.flatMap((arc) => [arc.cdCover, arc.coverPhoto])].filter(
            (key): key is string => key !== null,
        ),
    );

sourceRoutes.get('/dramas/:id/sources', async (c) => {
    const target = targetOf(c);
    if (!target) return badTarget(c);
    const row = await getEntry(c.env.DB, 'dramas', target.id);
    if (!row) return errorResponse(c, HTTP_STATUS.notFound, 'no such drama');
    const definition = JSON.parse(row.definition) as Json;
    const folder = r2FolderOf(definition);
    if (folder === undefined)
        return errorResponse(c, HTTP_STATUS.unprocessable, 'audio.host must be r2 to scan');
    return c.json(await scanSources(c.env.AUDIO, folder, definition));
});

/** key 嘅頂層資料夾用緊嘅 r2 劇（包括 draft）definition；冇就 undefined */
const dramaUsingFolder = async (db: D1Database, folder: string): Promise<Json | undefined> =>
    (await listStoredEntries(db))
        .filter((entry) => entry.kind === 'dramas')
        .map((entry) => JSON.parse(entry.definition) as Json)
        .find((definition) => r2FolderOf(definition) === folder);

/** key 喺某套劇最新掃描嘅 cdCover / coverPhoto 入面先係 true */
const isScannedSource = async (env: AppEnv['Bindings'], key: string): Promise<boolean> => {
    const folder = key.split(KEY_SEPARATOR)[0] ?? '';
    const definition = await dramaUsingFolder(env.DB, folder);
    if (!definition) return false;
    return allowedKeys(await scanSources(env.AUDIO, folder, definition)).has(key);
};

/** 副檔名（細楷，連 .）→ 圖片 Content-Type；唔係圖就 undefined */
const contentTypeOf = (key: string): string | undefined => {
    const dot = key.lastIndexOf('.');
    return dot < 0 ? undefined : R2_SOURCE_CONTENT_TYPES[key.slice(dot).toLowerCase()];
};

/** R2 有記 Content-Type 就要係圖片 MIME（冇記就靠副檔名） */
const isImageObject = (object: R2Object): boolean => {
    const stored = object.httpMetadata?.contentType?.split(';')[0]?.trim().toLowerCase();
    return stored === undefined || Object.values(R2_SOURCE_CONTENT_TYPES).includes(stored);
};

const notFound = (c: Context<AppEnv>) =>
    errorResponse(c, HTTP_STATUS.notFound, 'no such source image');

/** If-None-Match 有呢個 ETag（逗號分隔、容許 W/、* 都算） */
const etagMatches = (header: string | undefined, etag: string): boolean =>
    header !== undefined &&
    header
        .split(',')
        .map((value) => value.trim().replace(/^W\//, ''))
        .some((value) => value === etag || value === '*');

/** 檢查完 R2 object 嘅問題 response；冇問題 = undefined */
const objectProblem = (c: Context<AppEnv>, object: R2Object): Response | undefined => {
    if (object.size > R2_SOURCE_MAX_BYTES)
        return errorResponse(
            c,
            HTTP_STATUS.payloadTooLarge,
            `source image larger than ${R2_SOURCE_MAX_BYTES} bytes`,
        );
    if (!isImageObject(object))
        return errorResponse(c, HTTP_STATUS.unsupportedMediaType, 'source is not an image');
    return undefined;
};

const sourceHeaders = (etag: string) => ({
    'cache-control': R2_SOURCE_CACHE_CONTROL,
    etag,
    'x-content-type-options': 'nosniff',
});

/** 讀 object 傳出去；head 同 get 之間被覆蓋就照再驗一次（body 未讀，唔合格就唔傳） */
const streamSource = async (c: Context<AppEnv>, key: string, contentType: string) => {
    const object = await c.env.AUDIO.get(key);
    if (!object) return notFound(c);
    const problem = objectProblem(c, object);
    if (problem) {
        await object.body.cancel();
        return problem;
    }
    return c.body(object.body, HTTP_STATUS.ok, {
        ...sourceHeaders(object.httpEtag),
        'content-type': contentType,
        'content-length': String(object.size),
    });
};

sourceRoutes.get('/r2-source', async (c) => {
    const key = c.req.query('key');
    if (!key) return errorResponse(c, HTTP_STATUS.badRequest, 'key is required');
    const contentType = contentTypeOf(key);
    if (contentType === undefined || !(await isScannedSource(c.env, key))) return notFound(c);
    const head = await c.env.AUDIO.head(key);
    if (!head) return notFound(c);
    const problem = objectProblem(c, head);
    if (problem) return problem;
    if (etagMatches(c.req.header('if-none-match'), head.httpEtag))
        return c.body(null, HTTP_STATUS.notModified, sourceHeaders(head.httpEtag));
    return streamSource(c, key, contentType);
});
