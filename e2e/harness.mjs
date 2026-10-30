// e2e 共用嘅瀏覽器環境：固定時鐘 + 似真嘅 audio host + 唔出外網。run.mjs 同 touch.mjs 所有 context 都經呢度開，
// 兩邊唔會各自為政（例如一邊冇固定時鐘就會喺香港時間過咗午夜之後錯）。
import { readFileSync } from 'node:fs';
import { SAMPLE_RECORDINGS } from './sampleData.mjs';
import { silenceWav } from './silenceWav.mjs';

/**
 * 瀏覽器入面嘅「而家」：固定喺 2026-10-19（一）22:30 香港時間。
 * 假錄音列表（e2e/sampleData.mjs）最後一日係 2026-10-19，斷言都假設「今日」係 19/10：
 * 唔固定嘅話，香港時間一過午夜「今日」就變咗 20/10，今日節目、最近一集全部錯。
 * 揀 22:30：今日嘅日間節目（mini player 嘅在晴朗的一天出發等）已經播完，
 * 公子會（23:08）仲未開咪，所以 audio probe 唔會 probe 佢今日嗰集。
 */
export const E2E_NOW = '2026-10-19T22:30:00+08:00';

/** 同 src/config/constants.ts ALLOWED_AUDIO_ORIGIN 一樣（src/e2eSrcConstants.test.ts 鎖住） */
export const AUDIO_HOST = 'https://audio.hkfm903.live';
/**
 * 廣播劇音檔（R2）：同 src/config/constants.ts DRAMA_AUDIO_BASE 一樣（src/e2eSrcConstants.test.ts 鎖住）。
 * e2e 唔出外網，所有 context 一律答 404，唔使每個劇集測試自己 route
 */
export const DRAMA_AUDIO_BASE = 'https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev';
/**
 * Google Fonts（index.html 嘅 preload stylesheet + 字型檔）：e2e 唔出外網，由本機答。
 * Poppins 用 @fontsource/poppins（devDependency，OFL-1.1）嘅 latin / latin-ext woff2：頁頭標題、日子條、
 * mini player 跑馬燈嘅「冇剪走 / 有冇超出」斷言靠字型度量，Poppins 比 fallback（Inter 等）闊，
 * 用 fallback 量會 false negative（W-497）。Noto Sans TC / Noto Serif TC 唔供應：中文字喺任何字型都係約 1em 闊，
 * 用系統 CJK fallback 量出嚟差唔多，唔值得為 e2e 加十幾 MB 字型檔
 */
export const GOOGLE_FONTS_CSS = 'https://fonts.googleapis.com';
export const GOOGLE_FONTS_FILES = 'https://fonts.gstatic.com';
/** 本機字型檔喺 gstatic 嘅假路徑前綴（真 gstatic 唔會用 /e2e/，唔會同真網址混淆） */
const LOCAL_FONT_PREFIX = '/e2e/';
const FONTSOURCE_POPPINS = new URL('../node_modules/@fontsource/poppins/', import.meta.url);
/** 只供應拉丁字（UI 嘅英文、數字）；其他 subset（devanagari）app 用唔著 */
const POPPINS_SUBSETS = new Set(['latin', 'latin-ext']);
/** fontsource 每個字重嘅 CSS 入面一段 @font-face（前面有 /* poppins-<subset>-<weight>-normal *\/ 註解） */
const FONTSOURCE_FACE = /\/\* (poppins-([a-z-]+)-\d+-normal) \*\/\s*(@font-face \{[^}]*\})/g;

/** 某個字重嘅 @font-face（只要 latin / latin-ext），src 改指 gstatic 假路徑，unicode-range 照用 fontsource 嘅 */
const poppinsFaces = (weight) => {
    const css = readFileSync(new URL(`${weight}.css`, FONTSOURCE_POPPINS), 'utf8');
    return [...css.matchAll(FONTSOURCE_FACE)]
        .filter(([, , subset]) => POPPINS_SUBSETS.has(subset))
        .map(([, name, , face]) =>
            face.replace(
                /src:[^;]*;/,
                `src: url(${GOOGLE_FONTS_FILES}${LOCAL_FONT_PREFIX}${name}.woff2) format('woff2');`,
            ),
        );
};

/** css2 網址嘅 family=Poppins:wght@400;500;600 → [400, 500, 600]；冇 Poppins 就 [] */
const requestedPoppinsWeights = (url) =>
    new URL(url).searchParams
        .getAll('family')
        .filter((family) => family.split(':')[0] === 'Poppins')
        .flatMap((family) => (/wght@([\d;]+)/.exec(family)?.[1] ?? '').split(';'))
        .filter(Boolean)
        .map(Number);

/** fonts.googleapis.com：答 index.html 要嘅 Poppins 字重；其他字體（Noto）冇 @font-face，用系統 fallback */
const fontsCssResponder = (route) => {
    const body = requestedPoppinsWeights(route.request().url()).flatMap(poppinsFaces).join('\n');
    return route.fulfill({ status: 200, contentType: 'text/css', body });
};

/** fonts.gstatic.com：只答本機有嘅 Poppins woff2（latin / latin-ext × 任何字重），其他一律 404 */
const fontFilesResponder = (route) => {
    const { pathname } = new URL(route.request().url());
    const file = pathname.slice(LOCAL_FONT_PREFIX.length);
    const known =
        pathname.startsWith(LOCAL_FONT_PREFIX) &&
        /^poppins-(latin|latin-ext)-\d+-normal\.woff2$/.test(file);
    if (!known) return route.fulfill({ status: 404, body: '' });
    let body;
    try {
        body = readFileSync(new URL(`files/${file}`, FONTSOURCE_POPPINS));
    } catch {
        return route.fulfill({ status: 404, body: '' });
    }
    // 字型係 CORS request（index.html preconnect 有 crossorigin），冇 ACAO 瀏覽器會拒用
    return route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'font/woff2', 'Access-Control-Allow-Origin': '*' },
        body,
    });
};

/**
 * e2e 唔出外網：刻意 mock 咗嘅外部 origin（newE2EContext 入面 route 住）。
 * 其他外部 request 一律 abort，同時記低入 externalRequests，run.mjs 最尾斷言要係空
 */
const MOCKED_ORIGINS = new Set([
    AUDIO_HOST,
    DRAMA_AUDIO_BASE,
    GOOGLE_FONTS_CSS,
    GOOGLE_FONTS_FILES,
]);
/** 本機 preview server（run.mjs 嘅 BASE） */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
/** 出咗外網（唔係本機、唔係刻意 mock 嘅 host）嘅 request URL；所有 context 共用 */
export const externalRequests = [];

/** http(s) 先算網絡 request；data: / blob: 等唔會出網 */
const isExternal = (url) => {
    const { protocol, hostname, origin } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return !LOCAL_HOSTS.has(hostname) && !MOCKED_ORIGINS.has(origin);
};

const recordExternal = (request) => {
    if (isExternal(request.url())) externalRequests.push(request.url());
};

const AUDIO_SECONDS = 600;
const wav = silenceWav(AUDIO_SECONDS);
/** 同 src/services/probeStore.ts 嘅 PROBE_STORAGE_KEY 一樣（src/e2eSrcConstants.test.ts 鎖住）：app 嘅錄音列表只會由呢度讀 */
export const PROBE_STORAGE_KEY = '903player:probed:v1';

/** 同一個網址可能有唔同編碼寫法（中文字 / %XX），比較前統一 */
const normalizeUrl = (url) => new URL(url).href;

/** 用靜音 WAV 答一個音檔 request；支援 Range（206 Partial Content），seek 先會成功 */
export const serveWav = (route) => {
    const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range ?? '');
    const start = range ? Number(range[1]) : 0;
    const end = range && range[2] ? Number(range[2]) : wav.length - 1;
    return route.fulfill({
        status: range ? 206 : 200,
        headers: {
            'Content-Type': 'audio/wav',
            'Accept-Ranges': 'bytes',
            'Content-Length': String(end - start + 1),
            ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}),
        },
        body: wav.subarray(start, end + 1),
    });
};

/**
 * 似真嘅 audio host：只答假錄音列表入面（同 extraUrls）嘅檔，其他一律 404，同原站一樣。
 * 以前乜都答 200，app 嘅 audio probe（PR #29）就會「搵到」列表冇嘅集數，令最近一集變咗
 */
const audioResponder = (extraUrls) => {
    const known = new Set([...SAMPLE_RECORDINGS.map((r) => r.url), ...extraUrls].map(normalizeUrl));
    return (route) =>
        known.has(normalizeUrl(route.request().url()))
            ? serveWav(route)
            : route.fulfill({ status: 404, body: '' });
};

/**
 * 喺瀏覽器入面行（addInitScript）：storage 未有先寫入假錄音，當係用戶之前 probe 到嘅。
 * 每次 navigation（包括 reload）都會行，所以已有就唔好蓋過，否則 probe 寫低嘅結果會冇咗。
 * about:blank 等冇 origin 嘅頁面讀 localStorage 會 throw，直接略過
 */
const seedProbeStore = ({ key, found }) => {
    try {
        if (localStorage.getItem(key) === null) {
            localStorage.setItem(key, JSON.stringify({ found, misses: {} }));
        }
    } catch {
        // 冇 localStorage 就唔使 seed
    }
};

/**
 * 開一個 e2e context：時鐘由 E2E_NOW 開始照常行（clock.install 唔會暫停，
 * setTimeout / setInterval / Date.now 跟真實時間前進，播放進度、定時存進度、更新檢查照行），
 * audio host 用上面嘅似真版本，劇集音檔（R2）一律 404。extraAudioUrls：額外當係存在嘅檔（例如測 probe 搵到新一集）。
 * now：時鐘起點（預設 E2E_NOW），例如測冇節目嘅星期日
 */
/** 啟動畫面最少顯示 2 秒，期間會蓋住成頁：用坐標嘅手勢會撳中佢，所以要等佢移走 */
const SPLASH_GONE_TIMEOUT_MS = 10_000;

const waitForSplashGone = (page) =>
    page.locator('#splash').waitFor({ state: 'detached', timeout: SPLASH_GONE_TIMEOUT_MS });

/** 每次 goto / reload 完（真係載過成頁）都等啟動畫面淡出先交返；淨係換 hash 嘅 goto 會即刻過 */
const waitForSplashOnLoad = (page) => {
    for (const method of ['goto', 'reload']) {
        const navigate = page[method].bind(page);
        page[method] = async (...args) => {
            const response = await navigate(...args);
            await waitForSplashGone(page);
            return response;
        };
    }
};

export const newE2EContext = async (
    browser,
    options = {},
    { extraAudioUrls = [], now = E2E_NOW } = {},
) => {
    const ctx = await browser.newContext(options);
    ctx.on('request', recordExternal);
    // 最先註冊 = 最低優先（Playwright 後註冊嘅 route 先試）：下面 mock 咗嘅 host 唔會跌落嚟
    await ctx.route(
        (url) => isExternal(url.href),
        (route) => route.abort('blockedbyclient'),
    );
    await ctx.route(`${GOOGLE_FONTS_CSS}/**`, fontsCssResponder);
    await ctx.route(`${GOOGLE_FONTS_FILES}/**`, fontFilesResponder);
    await ctx.clock.install({ time: new Date(now) });
    await ctx.route(`${AUDIO_HOST}/**`, audioResponder(extraAudioUrls));
    await ctx.route(`${DRAMA_AUDIO_BASE}/**`, (route) => route.fulfill({ status: 404, body: '' }));
    await ctx.addInitScript(seedProbeStore, { key: PROBE_STORAGE_KEY, found: SAMPLE_RECORDINGS });
    ctx.on('page', waitForSplashOnLoad);
    return ctx;
};

/**
 * 截圖共用選項：跑馬燈、唱片自轉呢啲無限 CSS 動畫回到起點（finite 嘅就行到尾），
 * 唔會因為 bundle 載入快慢令相位浮動，兩個 branch 嘅截圖可以逐 pixel 比對（S-510）。
 * 只影響截圖，唔影響斷言
 */
export const SHOT = { animations: 'disabled' };

/** e2e 手機尺寸（直向）：劇集頁、mini player 規則、全集表都用呢個 */
export const PHONE = { width: 390, height: 844 };

/**
 * 開一個手機尺寸（PHONE、深色）嘅 e2e context 同 page，page 嘅 JS error 收入 errors。
 * contextOptions 蓋過預設（例如 hasTouch）；clock 傳畀 newE2EContext（例如 { now }）
 */
export const newE2EPage = async (browser, errors, contextOptions = {}, clock = {}) => {
    const ctx = await newE2EContext(
        browser,
        { viewport: PHONE, colorScheme: 'dark', ...contextOptions },
        clock,
    );
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    return { ctx, p };
};

/** 等一個 Playwright promise：成功 true、timeout / 失敗 false（唔 throw，交畀斷言 log） */
export const succeeds = (promise) =>
    promise.then(
        () => true,
        () => false,
    );

/** locator.waitFor（options 例如 { state: 'detached', timeout }）等到就 true，等唔到 false */
export const isShown = (locator, options) => succeeds(locator.waitFor(options));

/** 同 src/config/constants.ts STALL_FIRST_RETRY_MS 一樣（src/e2eSrcConstants.test.ts 鎖住） */
export const STALL_FIRST_RETRY_MS = 4000;
/** 讀鎖屏狀態要比卡住 deadline 早咁耐：留位畀 CPU 爭用時 waitForFunction 遲咗 poll */
const PLAYBACK_STATE_MARGIN_MS = 1000;
/**
 * 等鎖屏狀態最多幾耐：要短過 app 嘅 STALL_FIRST_RETRY_MS，
 * 卡住 deadline 過咗先會轉 paused，唔可以等到嗰陣先讀（S-582：由 app 常數計，唔再手抄）
 */
const PLAYBACK_STATE_WAIT_MS = STALL_FIRST_RETRY_MS - PLAYBACK_STATE_MARGIN_MS;

/**
 * 等 navigator.mediaSession.playbackState 變成 expected（React effect commit 之後先寫），
 * 唔用固定 waitForTimeout，CPU 爭用時唔會 flake（S-579）；返回最後讀到嘅狀態畀斷言 log
 */
export const waitForPlaybackState = async (p, expected) => {
    await succeeds(
        p.waitForFunction((want) => navigator.mediaSession.playbackState === want, expected, {
            timeout: PLAYBACK_STATE_WAIT_MS,
        }),
    );
    return p.evaluate(() => navigator.mediaSession.playbackState);
};

/** 入頁等幾耐自動播（之後當係播緊其他嘢，唔會自動播） */
const AUTOPLAY_WAIT_MS = 2000;

/** 等自動播放；等唔到即係入頁前 player 已經載入咗其他嘢（唔自動播、唔蓋過），撳播放先播呢頁 */
export const ensurePlaying = async (p) => {
    const pause = p.getByRole('button', { name: '暫停', exact: true });
    try {
        await pause.waitFor({ timeout: AUTOPLAY_WAIT_MS });
        return;
    } catch {
        await p.getByRole('button', { name: '播放', exact: true }).click();
        await pause.waitFor({ timeout: 5000 });
    }
};
