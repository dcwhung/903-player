// runtime catalog.json e2e（Backend Phase 1）：e2e build 嘅 VITE_CATALOG_URL = <base>e2e-catalog/catalog.json，
// harness 預設答 404（其他 section 用內建資料）；呢度後註冊 route 蓋過，答 scripts/buildCatalogJson.mjs 生成嘅 catalog
// （內建全部節目 / 劇集 + 一套只有 catalog 先有嘅測試劇），圖由 src/catalog/*/library/ 直接讀。
// 1 正常 → 主頁即見測試劇；2 壞 JSON / 唔識 schemaVersion → 用內建；3 慢過 1.5s → 用內建、splash 照收；
// 4 第二次開 app 斷網 → SW cache 嘅 catalog；5 舊版（v1）進度用 remote catalog 照搬
import { readFileSync } from 'node:fs';
import { buildCatalogDocument } from '../scripts/buildCatalogJson.mjs';
import { E2E_CATALOG_GLOB, isShown, newE2EPage, runSection } from './harness.mjs';
import { checkStorage, seedV1 } from './storageMigration.mjs';

const CATALOG_DIR = new URL('../src/catalog/', import.meta.url);
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
    return { ...doc, dramas: [...doc.dramas, extra] };
};

/** <base>e2e-catalog/<shows|dramas>/<id>/<檔名> → src/catalog/<kind>/library/<id>/<檔名> */
const imageFile = (pathname) => {
    const [, rest = ''] = decodeURIComponent(pathname).split(`/${CATALOG_FOLDER}`);
    const [kind, ...file] = rest.split('/');
    return new URL(`${kind}/library/${file.join('/')}`, CATALOG_DIR);
};

const serveImage = (route) => {
    try {
        const body = readFileSync(imageFile(new URL(route.request().url()).pathname));
        return route.fulfill({ status: 200, contentType: 'image/webp', body });
    } catch {
        return route.fulfill({ status: 404, body: '' });
    }
};

/** catalogBody：catalog.json 答乜（string）；delayMs：遲幾耐先答 */
const catalogRoute =
    ({ catalogBody, delayMs = 0 }) =>
    async (route) => {
        if (!route.request().url().includes('catalog.json')) return serveImage(route);
        if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
        return route
            .fulfill({ status: 200, contentType: 'application/json', body: catalogBody })
            .catch(() => undefined); // page 已經放棄（timeout）就唔使答
    };

const openWithCatalog = async (env, routeOptions) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors);
    await ctx.route(E2E_CATALOG_GLOB, catalogRoute(routeOptions));
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

const checkValidCatalog = async (env, json) => {
    const { log } = env;
    const { p } = await openWithCatalog(env, { catalogBody: json });
    await p.goto(env.base);
    const { golden, remote } = await shelfState(p);
    log(golden && remote, `Remote catalog：主頁書架即刻見到「${REMOTE_NAME}」，內建劇照出`);
    const art = await remoteTile(p)
        .locator('img')
        .first()
        .evaluate((img) => ({ src: img.getAttribute('src') ?? '', width: img.naturalWidth }))
        .catch(() => ({ src: '', width: 0 }));
    log(
        art.src.includes(`/${CATALOG_FOLDER}dramas/`) && art.width > 0,
        `Remote catalog：測試劇嘅圖由 catalog manifest 嘅 URL 載入（${art.src}）`,
    );
};

const checkFallback = async (env, label, routeOptions) => {
    const { p } = await openWithCatalog(env, routeOptions);
    const started = Date.now();
    await p.goto(env.base);
    const splashMs = Date.now() - started;
    const { golden, remote } = await shelfState(p);
    env.log(golden && !remote, `Remote catalog ${label}：用返內建資料（冇「${REMOTE_NAME}」）`);
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
    await section('Remote catalog：v1 進度升級', () => checkMigration(env, json));
};
