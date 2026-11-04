// PWA 換版 e2e（v1.21.4 起）：有新版時頁面自己 reload 去新版，一次就夠，播緊嘢唔會打斷。
// 唔使 build 兩次：自己開個 static server serve dist，換版 = sw.js 尾加一行註解（byte 唔同就係新 SW），
// 數頁面 load 咗幾多次。用 port 0，唔會同 run.mjs 嘅 vite preview 撞
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { ensurePlaying, newE2EContext, waitForPlaybackState } from './harness.mjs';

const DIST = new URL('../dist/', import.meta.url).pathname;
const BASE_PATH = '/903-player/';
const SW_PATH = 'sw.js';
const LOOPBACK = '127.0.0.1';
const CONTENT_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
};

// 等 SW 接管 / 等 reload 最多幾耐
const CONTROLLER_WAIT_MS = 15_000;
const RELOAD_WAIT_MS = 15_000;
// reload 完再等咁耐：確定冇第二次 reload（loop guard）
const NO_SECOND_RELOAD_MS = 3000;
// 播緊嘢時等咁耐：會 reload 嘅話呢段時間已經 reload 咗
const PLAYING_HOLD_MS = 4000;
// 同 src/pwa/updateManager.ts UPDATE_IDLE_GRACE_MS（60 s）再多 1 s；刻意寫死做獨立對照
const GRACE_PLUS_MS = 61_000;
const POLL_MS = 100;
const PHONE = { width: 390, height: 844 };
const PLAY_ROUTE = '#/show/gongzi';

/**
 * request URL → dist 入面嘅檔案；唔喺 BASE_PATH 底、decode 唔到（壞 %）、或者 resolve 出咗 dist
 * （例如 ..%2F..%2F）一律 null（W-520）
 */
const distFile = (url) => {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(url, 'http://e2e').pathname);
    } catch {
        return null;
    }
    if (!pathname.startsWith(BASE_PATH)) return null;
    const name = pathname.slice(BASE_PATH.length) || 'index.html';
    const path = resolve(DIST, name);
    return path.startsWith(DIST) ? { name, path } : null;
};

/**
 * 細 static server：dist 照出，sw.js 尾加「第幾版」註解。所有檔案 no-cache（同 hosting 規則一樣，
 * 瀏覽器每次 update() 都會拎到最新 sw.js）
 */
const startDistServer = async () => {
    let revision = 0;
    const server = createServer(async (req, res) => {
        const file = distFile(req.url);
        if (file === null) {
            res.writeHead(404).end();
            return;
        }
        try {
            let body = await readFile(file.path);
            if (file.name === SW_PATH) body = `${body}\n// e2e revision ${revision}\n`;
            res.writeHead(200, {
                'content-type': CONTENT_TYPES[extname(file.name)] ?? 'application/octet-stream',
                'cache-control': 'no-cache',
            });
            res.end(body);
        } catch {
            res.writeHead(404).end();
        }
    });
    // 只聽本機：唔好將 dist 開放畀同一個網絡嘅其他機（W-520）
    await new Promise((resolve) => server.listen(0, LOOPBACK, resolve));
    return {
        base: `http://${LOOPBACK}:${server.address().port}${BASE_PATH}`,
        /** 部署新版：之後 fetch 嘅 sw.js 唔同 */
        release: () => (revision += 1),
        close: () => new Promise((resolve) => server.close(resolve)),
    };
};

/** 喺瀏覽器入面行（addInitScript）：visibility 由 window.__e2eHidden 話事（同 hiddenPlayback.mjs 一樣） */
const installHiddenControl = () => {
    window.__e2eHidden = false;
    Object.defineProperty(Document.prototype, 'visibilityState', {
        configurable: true,
        get: () => (window.__e2eHidden ? 'hidden' : 'visible'),
    });
    Object.defineProperty(Document.prototype, 'hidden', {
        configurable: true,
        get: () => window.__e2eHidden,
    });
};

const setHidden = (p, hidden) =>
    p.evaluate((value) => {
        window.__e2eHidden = value;
        document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);

/** 開一個 tab，數佢 load 咗幾多次（第一次入頁都算） */
const openTab = async (ctx, url, errors) => {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    const tab = { p, loads: 0 };
    p.on('load', () => (tab.loads += 1));
    await p.goto(url);
    await p.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
        timeout: CONTROLLER_WAIT_MS,
    });
    return tab;
};

/** 叫瀏覽器即刻查新版（等同 app 嘅 registration.update()，唔使等 30 分鐘 interval） */
const checkForUpdate = (p) =>
    p.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());

/** 新 SW 裝好喺 waiting（未 skipWaiting） */
const readWaiting = (p) =>
    p.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting));

/** 等新 SW 裝好喺 waiting；等唔到 false */
const waitForWaiting = (p) =>
    p
        .waitForFunction(
            async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting),
            undefined,
            { timeout: CONTROLLER_WAIT_MS, polling: POLL_MS },
        )
        .then(
            () => true,
            () => false,
        );

/** 等到 tab load 夠 expected 次（等唔到就返回而家幾多次） */
const waitForLoads = async (tab, expected, timeout = RELOAD_WAIT_MS) => {
    const deadline = Date.now() + timeout;
    while (tab.loads < expected && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
    return tab.loads;
};

/** 等 reload 一次，再等多陣確定冇第二次；返回 reload 咗幾多次 */
const reloadsAfterUpdate = async (tab, loadsBefore) => {
    await waitForLoads(tab, loadsBefore + 1);
    await tab.p.waitForTimeout(NO_SECOND_RELOAD_MS);
    return tab.loads - loadsBefore;
};

const newContext = async (env, ctxOptions = {}) => {
    const ctx = await newE2EContext(env.browser, { viewport: PHONE, ...ctxOptions });
    await ctx.addInitScript(installHiddenControl);
    return ctx;
};

/** 第一次開 app（register 時冇 controller）冇播嘢：有新版就 reload 一次（v1.21.4） */
const checkFirstVisit = async (env, server) => {
    const ctx = await newContext(env);
    const tab = await openTab(ctx, server.base, env.errors);
    const before = tab.loads;
    server.release();
    await checkForUpdate(tab.p);
    const reloads = await reloadsAfterUpdate(tab, before);
    env.log(reloads === 1, `PWA 換版（第一次開 app）：有新版 reload ${reloads} 次（預期 1）`);
    await ctx.close();
};

/** 返嚟嘅用戶（register 時已經有 controller）：reload 一次，唔會 library + 自己兩邊各 reload 一次 */
const checkReturningVisit = async (env, server) => {
    const ctx = await newContext(env);
    const tab = await openTab(ctx, server.base, env.errors);
    await tab.p.reload();
    await waitForLoads(tab, 2);
    const before = tab.loads;
    server.release();
    await checkForUpdate(tab.p);
    const reloads = await reloadsAfterUpdate(tab, before);
    env.log(reloads === 1, `PWA 換版（返嚟嘅用戶）：有新版 reload ${reloads} 次（預期 1）`);
    await ctx.close();
};

/** 兩個 tab 都冇播嘢（CUI-0017）：搶輸 skipWaiting 嗰個 tab 都要 reload 去新版 */
const checkTwoTabs = async (env, server) => {
    const ctx = await newContext(env);
    const a = await openTab(ctx, server.base, env.errors);
    await a.p.reload();
    await waitForLoads(a, 2);
    const b = await openTab(ctx, server.base, env.errors);
    const [aBefore, bBefore] = [a.loads, b.loads];
    server.release();
    await checkForUpdate(b.p);
    const [aReloads, bReloads] = await Promise.all([
        reloadsAfterUpdate(a, aBefore),
        reloadsAfterUpdate(b, bBefore),
    ]);
    env.log(
        aReloads === 1 && bReloads === 1,
        `PWA 換版（兩個 tab，CUI-0017）：兩個 tab 都 reload 一次（A ${aReloads}、B ${bReloads}）`,
    );
    await ctx.close();
};

/**
 * 播緊嘢：收埋 app 過咗 grace period 都唔 reload（前景本身已經唔換，要喺背景先驗到「播緊唔換」）；
 * 停播之後喺背景再過 grace period 先 reload 一次
 */
const checkPlaying = async (env, server) => {
    const label = 'PWA 換版（播緊嘢）';
    const ctx = await newContext(env);
    const tab = await openTab(ctx, `${server.base}${PLAY_ROUTE}`, env.errors);
    await ensurePlaying(tab.p);
    const before = tab.loads;
    server.release();
    await checkForUpdate(tab.p);
    // update() resolve 嗰陣新 SW 仲 installing：等佢裝好喺 waiting 先快轉，否則未有新版就驗咗（W-519）
    const detected = await waitForWaiting(tab.p);
    await setHidden(tab.p, true);
    await tab.p.clock.fastForward(GRACE_PLUS_MS);
    await tab.p.waitForTimeout(PLAYING_HOLD_MS);
    const stillWaiting = await readWaiting(tab.p);
    env.log(
        detected && stillWaiting && tab.loads === before,
        `${label}：收埋 app 播緊嘢，新版裝好喺 waiting（${detected} → ${stillWaiting}），過咗 grace period 都唔換、唔 reload（reload ${tab.loads - before} 次）`,
    );
    // 鎖屏掣暫停：收埋咗都撳得（Playwright click 唔睇 visibilityState）
    await tab.p.getByRole('button', { name: '暫停', exact: true }).click();
    // 等 app 真係停咗先快轉：停止時間由 pause event 開始計，快轉早過佢就白過
    const paused = await waitForPlaybackState(tab.p, 'paused');
    await tab.p.clock.fastForward(GRACE_PLUS_MS);
    const reloads = await reloadsAfterUpdate(tab, before);
    env.log(
        reloads === 1,
        `${label}：停播（${paused}）之後喺背景過咗 grace period 先 reload ${reloads} 次（預期 1）`,
    );
    await ctx.close();
};

const SCENARIOS = [
    ['PWA 換版（第一次開 app）', checkFirstVisit],
    ['PWA 換版（返嚟嘅用戶）', checkReturningVisit],
    ['PWA 換版（兩個 tab）', checkTwoTabs],
    ['PWA 換版（播緊嘢）', checkPlaying],
];

/** PWA 換版：第一次開 / 返嚟 / 兩個 tab / 播緊嘢；每個情境一個 section（runSection 由 run.mjs 傳入） */
export const runPwaUpdateChecks = async (env, section) => {
    const server = await startDistServer();
    try {
        for (const [label, check] of SCENARIOS) {
            await section(label, () => check(env, server));
        }
    } finally {
        await server.close();
    }
};
