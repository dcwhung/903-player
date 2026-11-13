// runtime catalog.json e2e（Backend Phase 1）：e2e build 嘅 VITE_CATALOG_URL = <base>e2e-catalog/catalog.json，
// harness 預設答 404（其他 section 用內建資料）；呢度後註冊 route 蓋過，答 scripts/buildCatalogJson.mjs 生成嘅 catalog
// （內建全部節目 / 劇集 + 一套只有 catalog 先有嘅測試劇），圖由 src/catalog/*/library/ 直接讀。
// 1 正常 → 主頁即見測試劇；2 壞 JSON / 唔識 schemaVersion → 用內建；3 慢過 1.5s → 用內建、splash 照收；
// 4 第二次開 app 斷網 → SW cache 嘅 catalog；5 舊版（v1）進度用 remote catalog 照搬；
// 6 跨 origin 圖（似 Worker：有 CORS header）：<img crossorigin> 照出到（S-764）；
// 7 harness 預設（冇蓋 route）：SW 嘅 catalog request 由 e2e preview 答 404，catalog-json cache 冇 key（S-765）。
// 8 首頁 banner（Phase 4 L3）：fixture 帶 banner → 主頁橫額用 catalog 嘅圖（同 origin + 跨 origin 都試）；
//   fallback 內建資料 → 用返 src/assets 內建圖。banner 圖由 src/assets 直接讀（尺寸同 catalog 鎖死嘅一樣）
// 9 catalog banner 圖載入失敗（S-929）：404（直版 / 手機打橫 / 闊橫版）同跨 origin 冇 CORS header →
//   <img onError> 換返 src/assets 內建圖，照載入到
// 所有 route 都好似 apps/api Worker 咁答 Access-Control-Allow-Origin + Vary: Origin
import { readFileSync } from 'node:fs';
import { buildCatalogDocument } from '../scripts/buildCatalogJson.mjs';
import {
    BANNER_ALT,
    CATALOG_IMAGE_HOST,
    E2E_CATALOG_GLOB,
    PHONE,
    isShown,
    newE2EPage,
    runSection,
} from './harness.mjs';
import { checkStorage, seedV1 } from './storageMigration.mjs';

const CATALOG_DIR = new URL('../src/catalog/', import.meta.url);
const ASSETS_DIR = new URL('../src/assets/', import.meta.url);
/** catalog banner 圖嘅 sub-folder：<base>e2e-catalog/banner/<檔名> → src/assets/<檔名> */
const BANNER_FOLDER = 'banner';
const BANNER_FILES = { standard: 'banner.webp', long: 'banner-wide.webp' };
/** S-929：catalog 指住但 route 搵唔到嘅 banner 檔（serveImage 答 404） */
const MISSING_BANNER_FILES = { standard: 'missing-banner.webp', long: 'missing-banner-wide.webp' };
/** S-929：橫額三種擺法都要退返內建圖——直版預設 <picture>、手機打橫 FittedBanner、闊橫版格 */
const BANNER_VIEWPORTS = [
    ['直版', PHONE],
    ['手機打橫', { width: PHONE.height, height: PHONE.width }],
    ['闊橫版', { width: 1300, height: 800 }],
];
const CATALOG_FOLDER = 'e2e-catalog/';
const SHELF = '廣播劇';
const WAIT_MS = 5000;
/** 唔應該出現嘅嘢：等呢個耐都冇就當冇 */
const ABSENT_WAIT_MS = 1500;
/** 同 src/config/catalogFetch.ts CATALOG_FETCH_TIMEOUT_MS 一樣（刻意寫死做獨立對照） */
const CATALOG_FETCH_TIMEOUT_MS = 1500;
const SLOW_RESPONSE_MS = CATALOG_FETCH_TIMEOUT_MS + 1000;
/** 同 run.mjs checkSplashRemoved 一樣：開頁到啟動畫面移走最多 5 秒 */
const SPLASH_BUDGET_MS = 5000;
/** SW NetworkFirst 收到 response 之後寫 cache 係 async：等一陣先數 key */
const SW_CACHE_SETTLE_MS = 1000;

/** 跨 origin 圖 host（似 apps/api Worker）；path 同本機 e2e-catalog/ 一樣，imageFile 照用 */
const CROSS_ORIGIN_IMAGE_BASE = `${CATALOG_IMAGE_HOST}/${CATALOG_FOLDER}`;
const CROSS_ORIGIN_GLOB = `${CATALOG_IMAGE_HOST}/**`;

/** 只有 catalog.json 先有嘅測試劇：借蘭茜夫人劇場嘅 definition 同圖 */
const REMOTE_ID = 'e2e-remote';
const REMOTE_NAME = 'E2E 遠端劇';
const DONOR_ID = 'lancy';

const remoteDocument = (base) => {
    const imageBase = new URL(CATALOG_FOLDER, base).pathname;
    const doc = buildCatalogDocument({ catalogDir: CATALOG_DIR.pathname, imageBase });
    const donor = doc.dramas.find((d) => d.id === DONOR_ID);
    const extra = {
        ...donor,
        id: REMOTE_ID,
        definition: { ...donor.definition, name: REMOTE_NAME },
    };
    const bannerUrl = (file) => `${imageBase}${BANNER_FOLDER}/${file}`;
    const banner = {
        standard: bannerUrl(BANNER_FILES.standard),
        long: bannerUrl(BANNER_FILES.long),
    };
    return { ...doc, dramas: [...doc.dramas, extra], banner };
};

/**
 * <base>e2e-catalog/<shows|dramas>/<id>/<檔名> → src/catalog/<kind>/library/<id>/<檔名>；
 * <base>e2e-catalog/banner/<檔名> → src/assets/<檔名>
 */
const imageFile = (pathname) => {
    const [, rest = ''] = decodeURIComponent(pathname).split(`/${CATALOG_FOLDER}`);
    const [kind, ...file] = rest.split('/');
    if (kind === BANNER_FOLDER) return new URL(file.join('/'), ASSETS_DIR);
    return new URL(`${kind}/library/${file.join('/')}`, CATALOG_DIR);
};

/** 同 apps/api src/catalog/serve.ts：CORS 只回 player origin，一律 Vary: Origin */
const corsHeaders = (allowOrigin) => ({
    'access-control-allow-origin': allowOrigin,
    vary: 'Origin',
});

const serveImage = (route, allowOrigin) => {
    try {
        const body = readFileSync(imageFile(new URL(route.request().url()).pathname));
        const headers = corsHeaders(allowOrigin);
        return route.fulfill({ status: 200, contentType: 'image/webp', headers, body });
    } catch {
        return route.fulfill({ status: 404, body: '' });
    }
};

/** catalogBody：catalog.json 答乜（string）；delayMs：遲幾耐先答；allowOrigin：page 嘅 origin */
const catalogRoute =
    ({ catalogBody, delayMs = 0, allowOrigin }) =>
    async (route) => {
        if (!route.request().url().includes('catalog.json')) return serveImage(route, allowOrigin);
        if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
        const headers = corsHeaders(allowOrigin);
        return route
            .fulfill({ status: 200, contentType: 'application/json', headers, body: catalogBody })
            .catch(() => undefined); // page 已經放棄（timeout）就唔使答
    };

/** 開一頁，catalog.json 照 routeOptions 答；contextOptions（例如 viewport）交畀 newE2EPage（showGridCounts.mjs 都用） */
export const openWithCatalog = async (env, { contextOptions, ...routeOptions }) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, contextOptions);
    const allowOrigin = new URL(env.base).origin;
    await ctx.route(E2E_CATALOG_GLOB, catalogRoute({ ...routeOptions, allowOrigin }));
    await ctx.route(CROSS_ORIGIN_GLOB, (route) => serveImage(route, allowOrigin));
    return { ctx, p };
};

const remoteTile = (p) =>
    p
        .getByRole('navigation', { name: SHELF })
        .getByRole('button', { name: new RegExp(`^${REMOTE_NAME}`) });

const openShelf = async (p) => {
    await p.getByRole('button', { name: SHELF, exact: true }).click();
    await p.getByRole('navigation', { name: SHELF }).waitFor({ timeout: WAIT_MS });
};

/** 主頁廣播劇書架有冇測試劇（同時確認內建劇照出：用 fallback 都唔會白畫面） */
const shelfState = async (p) => {
    await openShelf(p);
    const shelf = p.getByRole('navigation', { name: SHELF });
    const golden = await isShown(shelf.getByRole('button', { name: /^黃金少年/ }), {
        timeout: WAIT_MS,
    });
    const remote = await isShown(remoteTile(p), { timeout: ABSENT_WAIT_MS });
    return { golden, remote };
};

/** 測試劇格嘅圖：src、有冇載入到、crossorigin attribute（S-764） */
const remoteArt = (p) =>
    remoteTile(p)
        .locator('img')
        .first()
        .evaluate((img) => ({
            src: img.getAttribute('src') ?? '',
            width: img.naturalWidth,
            crossOrigin: img.getAttribute('crossorigin'),
        }))
        .catch(() => ({ src: '', width: 0, crossOrigin: null }));

/** 主頁頁頂橫額嘅圖：真正載入咗邊張、有冇載入到、crossorigin attribute */
const bannerArt = (p) =>
    p
        .getByRole('heading', { level: 1 })
        .getByRole('img', { name: BANNER_ALT })
        .evaluate(async (img) => {
            await img.decode().catch(() => undefined);
            return {
                src: img.currentSrc,
                width: img.naturalWidth,
                crossOrigin: img.getAttribute('crossorigin'),
            };
        })
        .catch(() => ({ src: '', width: 0, crossOrigin: null }));

/** 橫額係 catalog banner：URL 喺 base 底下嘅 banner/、載入到、CORS 模式 */
const checkCatalogBanner = async (p, log, base, label) => {
    const art = await bannerArt(p);
    log(
        art.src.startsWith(`${base}${BANNER_FOLDER}/`) &&
            art.width > 0 &&
            art.crossOrigin === 'anonymous',
        `${label}：主頁橫額用 catalog banner，CORS 載入到（${art.src}）`,
    );
};

const checkValidCatalog = async (env, json) => {
    const { log } = env;
    const { p } = await openWithCatalog(env, { catalogBody: json });
    await p.goto(env.base);
    const { golden, remote } = await shelfState(p);
    log(golden && remote, `Remote catalog：主頁書架即刻見到「${REMOTE_NAME}」，內建劇照出`);
    const art = await remoteArt(p);
    log(
        art.src.includes(`/${CATALOG_FOLDER}dramas/`) && art.width > 0,
        `Remote catalog：測試劇嘅圖由 catalog manifest 嘅 URL 載入（${art.src}）`,
    );
    log(
        art.crossOrigin === 'anonymous',
        'Remote catalog：catalog 圖用 CORS 模式載入（crossorigin）',
    );
    const localBase = new URL(CATALOG_FOLDER, env.base).href;
    await checkCatalogBanner(p, log, localBase, 'Remote catalog banner');
};

/** 測試劇嘅圖搬去跨 origin host（似 Worker 出圖），其他照舊 */
const crossOriginDocument = (base, json) => {
    const doc = JSON.parse(json);
    const local = new URL(CATALOG_FOLDER, base).pathname;
    const moved = (url) => url.replace(local, CROSS_ORIGIN_IMAGE_BASE);
    const dramas = doc.dramas.map((d) =>
        d.id === REMOTE_ID
            ? {
                  ...d,
                  images: Object.fromEntries(
                      Object.entries(d.images).map(([f, u]) => [f, moved(u)]),
                  ),
              }
            : d,
    );
    const banner = { standard: moved(doc.banner.standard), long: moved(doc.banner.long) };
    return JSON.stringify({ ...doc, dramas, banner });
};

const checkCrossOriginImages = async (env, json) => {
    const { p } = await openWithCatalog(env, { catalogBody: crossOriginDocument(env.base, json) });
    await p.goto(env.base);
    const { remote } = await shelfState(p);
    const art = await remoteArt(p);
    env.log(
        remote && art.src.startsWith(CROSS_ORIGIN_IMAGE_BASE) && art.width > 0,
        `Remote catalog：跨 origin 圖有 CORS header，<img crossorigin> 照出到（${art.src}）`,
    );
    await checkCatalogBanner(
        p,
        env.log,
        CROSS_ORIGIN_IMAGE_BASE,
        'Remote catalog 跨 origin banner',
    );
};

/** 橫額係內建圖：載入到、唔係 catalog（本機 e2e-catalog/ 或者跨 origin host）嘅 URL */
const isBuiltInBanner = (art) =>
    art.width > 0 &&
    !art.src.includes(`/${CATALOG_FOLDER}`) &&
    !art.src.startsWith(CATALOG_IMAGE_HOST);

/** 等主頁橫額載入到一張圖（catalog 圖失敗會換圖，要等換完先量）；timeout 就照量，交畀斷言 */
const waitForBannerLoaded = (p) =>
    p
        .waitForFunction(
            (alt) => {
                const img = document.querySelector(`h1 img[alt="${alt}"]`);
                return img !== null && img.complete && img.naturalWidth > 0;
            },
            BANNER_ALT,
            { timeout: WAIT_MS },
        )
        .catch(() => undefined);

/** 記低 page 有冇 request 過 url 含 part 嘅檔（證明真係試過 catalog 圖先換） */
const requested = (ctx, part) => {
    const seen = { hit: false };
    ctx.on('request', (req) => {
        if (req.url().includes(part)) seen.hit = true;
    });
    return seen;
};

/** catalog banner 指去唔存在嘅檔（route 答 404），其他照舊 */
const missingBannerDocument = (base, json) => {
    const doc = JSON.parse(json);
    const folder = `${new URL(CATALOG_FOLDER, base).pathname}${BANNER_FOLDER}/`;
    const banner = {
        standard: `${folder}${MISSING_BANNER_FILES.standard}`,
        long: `${folder}${MISSING_BANNER_FILES.long}`,
    };
    return JSON.stringify({ ...doc, banner });
};

/** S-929：catalog banner 圖 404 → 每種擺法都換返內建圖（仍然用緊 remote catalog） */
const checkMissingBanner = async (env, json) => {
    const catalogBody = missingBannerDocument(env.base, json);
    for (const [device, viewport] of BANNER_VIEWPORTS) {
        const { ctx, p } = await openWithCatalog(env, {
            catalogBody,
            contextOptions: { viewport },
        });
        const tried = requested(ctx, MISSING_BANNER_FILES.standard.replace('.webp', ''));
        await p.goto(env.base);
        await waitForBannerLoaded(p);
        const art = await bannerArt(p);
        env.log(
            tried.hit && isBuiltInBanner(art),
            `Remote catalog banner 404（${device}）：主頁橫額換返內建圖（${art.src}）`,
        );
        await ctx.close();
    }
};

/** S-929：跨 origin banner 冇 CORS header（<img crossorigin> 會載入失敗）→ 換返內建圖 */
const checkBannerWithoutCors = async (env, json) => {
    const { ctx, p } = await openWithCatalog(env, {
        catalogBody: crossOriginDocument(env.base, json),
    });
    // 後註冊先行：蓋過 openWithCatalog 嘅跨 origin route，淨係 banner 唔帶 CORS header
    await ctx.route(`${CROSS_ORIGIN_IMAGE_BASE}${BANNER_FOLDER}/**`, (route) =>
        route.fulfill({
            status: 200,
            contentType: 'image/webp',
            body: readFileSync(imageFile(new URL(route.request().url()).pathname)),
        }),
    );
    const tried = requested(ctx, `${CROSS_ORIGIN_IMAGE_BASE}${BANNER_FOLDER}/`);
    await p.goto(env.base);
    await waitForBannerLoaded(p);
    const art = await bannerArt(p);
    env.log(
        tried.hit && isBuiltInBanner(art),
        `Remote catalog 跨 origin banner 冇 CORS：主頁橫額換返內建圖（${art.src}）`,
    );
};

const checkFallback = async (env, label, routeOptions) => {
    const { p } = await openWithCatalog(env, routeOptions);
    const started = Date.now();
    await p.goto(env.base);
    const splashMs = Date.now() - started;
    const { golden, remote } = await shelfState(p);
    env.log(golden && !remote, `Remote catalog ${label}：用返內建資料（冇「${REMOTE_NAME}」）`);
    const banner = await bannerArt(p);
    env.log(
        isBuiltInBanner(banner),
        `Remote catalog ${label}：主頁橫額用返內建圖（${banner.src}）`,
    );
    return splashMs;
};

const checkSlowCatalog = async (env, json) => {
    const splashMs = await checkFallback(env, '慢過 1.5 秒', {
        catalogBody: json,
        delayMs: SLOW_RESPONSE_MS,
    });
    env.log(
        splashMs < SPLASH_BUDGET_MS,
        `Remote catalog 慢過 1.5 秒：啟動畫面 ${splashMs}ms 內移走（< ${SPLASH_BUDGET_MS}ms）`,
    );
};

/** 等 SW 接管（第一次開 app 用 clientsClaim） */
const waitForController = (p) =>
    p.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
        timeout: WAIT_MS,
    });

const cachedCatalogs = (p) =>
    p.evaluate(async () => (await (await caches.open('catalog-json')).keys()).length);

const checkOfflineCache = async (env, json) => {
    const { log } = env;
    const { ctx, p } = await openWithCatalog(env, { catalogBody: json });
    await p.goto(env.base);
    await waitForController(p);
    // 第一次開 app 時 SW 未接管，catalog.json 冇經 SW；再開一次先入 SW cache
    await p.reload();
    const cached = await cachedCatalogs(p);
    log(cached > 0, `Remote catalog：SW 接管後 catalog.json 入咗 cache（${cached} 個）`);
    await ctx.setOffline(true);
    await p.reload();
    const { remote } = await shelfState(p);
    log(
        remote,
        `Remote catalog：第二次開 app 斷網，用 SW cache 嘅 catalog（見到「${REMOTE_NAME}」）`,
    );
    await ctx.setOffline(false);
};

/**
 * S-765：harness 預設（冇 section 蓋過 route）SW 發嘅 catalog request 原封不動去本機 preview（S-648），
 * e2e preview 對 e2e-catalog/ 答 404（vite.config.ts e2eCatalogNotFound，唔做 SPA fallback）→
 * NetworkFirst 唔 cache 非 200，catalog-json cache 要係空。先確認 SW 真係發過 request，唔係空過
 */
const checkDefaultNotCached = async (env) => {
    const { log } = env;
    const { ctx, p } = await newE2EPage(env.browser, env.errors);
    const swResponses = [];
    ctx.on('requestfinished', async (req) => {
        if (!req.serviceWorker() || !req.url().includes('catalog.json')) return;
        swResponses.push((await req.response())?.status() ?? 0);
    });
    await p.goto(env.base);
    await waitForController(p);
    await p.reload();
    await p.waitForTimeout(SW_CACHE_SETTLE_MS);
    const cached = await cachedCatalogs(p);
    log(
        swResponses.length > 0 && swResponses.every((s) => s === 404),
        `Remote catalog 預設：SW 嘅 catalog.json request 由 preview 答 404（${swResponses.join(' / ') || '冇 request'}）`,
    );
    log(cached === 0, `Remote catalog 預設：catalog-json cache 冇 key（${cached} 個，S-765）`);
};

const checkMigration = async (env, json) => {
    const label = 'Remote catalog + v1 → v2 升級';
    const { ctx, p } = await openWithCatalog(env, { catalogBody: json });
    await seedV1(ctx);
    await p.goto(env.base);
    const { remote } = await shelfState(p);
    env.log(remote, `${label}：今次用緊 remote catalog`);
    await checkStorage(p, label, env.log);
};

export const runRemoteCatalogChecks = async (env) => {
    const json = JSON.stringify(remoteDocument(env.base));
    const wrongVersion = JSON.stringify({ ...JSON.parse(json), schemaVersion: 2 });
    const section = (label, run) => runSection(env.log, label, run, env.browser);
    await section('Remote catalog：正常', () => checkValidCatalog(env, json));
    await section('Remote catalog：壞 JSON', () =>
        checkFallback(env, '壞 JSON', { catalogBody: '{"schemaVersion": 1,' }),
    );
    await section('Remote catalog：schemaVersion 唔啱', () =>
        checkFallback(env, 'schemaVersion 2', { catalogBody: wrongVersion }),
    );
    await section('Remote catalog：慢', () => checkSlowCatalog(env, json));
    await section('Remote catalog：離線 SW cache', () => checkOfflineCache(env, json));
    await section('Remote catalog：預設 404 唔入 SW cache', () => checkDefaultNotCached(env));
    await section('Remote catalog：v1 進度升級', () => checkMigration(env, json));
    await section('Remote catalog：跨 origin 圖（CORS）', () => checkCrossOriginImages(env, json));
    await section('Remote catalog：banner 圖 404', () => checkMissingBanner(env, json));
    await section('Remote catalog：banner 冇 CORS', () => checkBannerWithoutCors(env, json));
};
