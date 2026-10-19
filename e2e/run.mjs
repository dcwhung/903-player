// 端對端測試：真 Chromium + vite preview + 假錄音列表 + 模擬 audio server（支援 Range）
// 用法：npm run e2e（截圖輸出去 e2e/screenshots/）
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { silenceWav } from './silenceWav.mjs';
import { runTouchChecks } from './touch.mjs';

const DEFAULT_PORT = 4173;
const MAX_PORT = 65535;

/** 多個 worktree 同時跑 e2e 時可以用 E2E_PORT 避開撞 port（strictPort 會令人誤測別人嘅 build） */
const parsePort = (raw) => {
    if (raw === undefined || raw === '') return DEFAULT_PORT;
    const port = Number(raw);
    if (!/^\d+$/.test(raw) || port < 1 || port > MAX_PORT) {
        console.error(`E2E_PORT 要係 1–${MAX_PORT} 嘅整數，收到「${raw}」`);
        process.exit(1);
    }
    return port;
};

const PORT = parsePort(process.env.E2E_PORT);
const BASE = `http://localhost:${PORT}/903-player/`;
const OUT = new URL('./screenshots', import.meta.url).pathname;
const AUDIO_SECONDS = 600;
const wav = silenceWav(AUDIO_SECONDS);
mkdirSync(OUT, { recursive: true });

// 預期色：刻意寫死做獨立對照（同下面 '#d4af5a' 一樣），唔係由 app 推返出嚟
const HOME_TOP = '#4f749c'; // HOME_THEME.bg（主頁漸變頂色）
const GONGZI_BG = '#111111'; // SHOW_THEMES.gongzi.bg
const SUNNYDAY_BG = '#0e2230'; // SHOW_THEMES.sunnyday.bg
const BADGIRL_BG = '#21151a'; // SHOW_THEMES.badgirl.bg
const WANNI_BG = '#1c1c1e'; // SHOW_THEMES.wanni.bg
const APP_VERSION_TEXT = `v${JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version}`;

let failures = 0;
const log = (ok, msg) => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
};

const startPreview = async () => {
    // 直接用 node 行 vite（唔經 npx），kill 先會停到真正嘅 server
    const viteBin = new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname;
    const server = spawn(
        process.execPath,
        [viteBin, 'preview', '--port', String(PORT), '--strictPort'],
        { stdio: 'ignore' },
    );
    for (let i = 0; i < 30; i += 1) {
        try {
            if ((await fetch(BASE)).ok) return server;
        } catch {
            // server 未起好
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    server.kill();
    throw new Error('vite preview did not start');
};

/** 版本號要見到，而且喺 mini player 上面（捲到底都唔會畀佢遮住） */
const checkVersionClear = async (p, label) => {
    const version = p.getByText(APP_VERSION_TEXT, { exact: true });
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const v = await version.boundingBox();
    const m = await p.getByRole('region', { name: '正在播放（今日節目）' }).boundingBox();
    const ok = (await version.isVisible()) && v !== null && m !== null && v.y + v.height <= m.y;
    log(
        ok,
        `${label}：版本號 ${APP_VERSION_TEXT} 喺 mini player 上面（底 ${v?.y + v?.height} ≤ ${m?.y}）`,
    );
};

const BANNER_ALT = '903 叱咤 Player：隨時隨地，音樂・節目・一click 即聽';
// 橫額高度同一格節目一樣（容許 subpixel 捨入）
const BANNER_HEIGHT_TOLERANCE_PX = 1;
const HOME_BANNER_VIEWPORTS = [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 430, height: 932 },
];

/** 主頁頁頂橫額：見到、同一格節目一樣高、有圓角；成頁唔捲、冇橫向捲動、版本號喺 mini player 上面 */
const checkHomeBanner = async (p, label, shot) => {
    const banner = p.getByRole('heading', { level: 1 }).getByRole('img', { name: BANNER_ALT });
    await banner.evaluate((img) => img.decode());
    const b = await banner.boundingBox();
    const tile = await p.locator('nav button').first().boundingBox();
    const radius = await banner.evaluate((img) => parseFloat(getComputedStyle(img).borderRadius));
    const diff = Math.abs(b.height - tile.height);
    log(
        (await banner.isVisible()) && diff <= BANNER_HEIGHT_TOLERANCE_PX,
        `${label}：橫額高 ${b.height.toFixed(2)}px = 節目格高 ${tile.height.toFixed(2)}px`,
    );
    log(
        Math.abs(b.x - tile.x) < 1 && b.y + b.height < tile.y,
        `${label}：橫額喺節目格上面、左邊對齊（${b.x} / ${tile.x}）`,
    );
    log(radius > 0, `${label}：橫額有圓角（${radius}px）`);
    log((await horizontalOverflow(p)) === 0, `${label}：冇橫向捲動`);
    const overflow = await p.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight,
    );
    log(overflow <= 0, `${label}：主頁成頁唔捲（超出 ${overflow}px）`);
    await p.screenshot({ path: `${OUT}/${shot}` });
    await checkVersionClear(p, label);
};

const MIN_VISIBLE_ROWS = 2;
// tokens.css 嘅 --player-max-share（0.6）係設計目標；用戶接受 62–66%，
// 所以 e2e 只要求節目頁播放器同今日節目卡（連指示點）≤ 66%，實際比例照印出嚟
const PLAYER_MAX_SHARE = 0.66;
const STRIP_DRAG_PX = 60;
const STRIP = '[aria-roledescription="轉集"]';
/** 每個節目頁尺寸量到嘅播放器高度比例、唱片闊度、清單行數（最尾印成表） */
const metrics = [];
/** 今日節目頁：卡（連指示點）佔高、清單行數 */
const todayMetrics = [];
const WHEEL_PX = 400;
const SWIPE_FROM_PX = 120;
// 同 tokens.css 嘅 --player-disc-min 同 Page.module.css 嘅成頁捲斷點（max-height）一致
const DISC_MIN_PX = 160;
// SHORT_HEIGHT_PX 要同三個 CSS 嘅 @media (max-height) 一樣：src/styles/shortHeightBreakpoint.node.test.ts
// 用 regex 讀呢一行，所以保持 `const SHORT_HEIGHT_PX = <數字>;` 嘅寫法
const SHORT_HEIGHT_PX = 561;
const SHOW_VIEWPORTS = [
    { width: 390, height: 844, swipe: true, homeFixed: true },
    { width: 320, height: 568, swipe: true, homeFixed: true },
    // 常見手機（iPhone SE / 細 Android / 有工具列嘅 Safari）
    { width: 390, height: 720 },
    { width: 375, height: 667 },
    { width: 390, height: 664 },
    // 橫向手機 / 矮視窗
    { width: 844, height: 390 },
    { width: 568, height: 320 },
    { width: 1280, height: 400 },
    { width: 390, height: 540 },
    // 成頁捲斷點兩邊：560 成頁捲，562 固定（最細唱片仍然見到兩行）
    { width: 390, height: 560 },
    { width: 390, height: 562 },
];

/** 節目頁固定：捲集數 panel 時 window 唔郁、控制掣仍然喺畫面，panel 自己嘅 scrollTop 有變 */
const checkFixedShowPage = async (p, label, shot) => {
    const panel = p.getByRole('region', { name: '集數' }).getByRole('list');
    const before = await panel.evaluate((el) => el.scrollTop);
    const box = await panel.boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await p.mouse.wheel(0, WHEEL_PX);
    await p.waitForTimeout(600);
    const after = await panel.evaluate((el) => el.scrollTop);
    log(after !== before, `${label}：集數 panel 自己捲（scrollTop ${before} → ${after}）`);
    // 喺唱片上面捲都唔會捲成頁
    const disc = await p.getByRole('slider', { name: '播放進度' }).boundingBox();
    await p.mouse.move(disc.x + disc.width / 2, disc.y + disc.height / 2);
    await p.mouse.wheel(0, WHEEL_PX);
    await p.waitForTimeout(300);
    const page = await p.evaluate(() => ({
        scrollY: window.scrollY,
        overflow: document.documentElement.scrollHeight - window.innerHeight,
    }));
    log(page.scrollY === 0 && page.overflow <= 0, `${label}：成頁唔捲（${JSON.stringify(page)}）`);
    await checkControlsInView(p, label);
    const rows = await visibleRows(panel);
    log(rows >= MIN_VISIBLE_ROWS, `${label}：清單見到約 ${rows.toFixed(2)} 行`);
    await logDiscSize(p, label, rows.toFixed(2));
    const share = await playerShare(p);
    log(
        share <= PLAYER_MAX_SHARE + 0.001,
        `${label}：播放器佔畫面高 ${(share * 100).toFixed(1)}%（≤ ${PLAYER_MAX_SHARE * 100}%）`,
    );
    await recordMetrics(p, label, rows.toFixed(2), share);
    await p.screenshot({ path: `${OUT}/${shot}` });
};

/** 播放器（PlayerPanel：唱片連弧 → 日子條 → 控制掣）佔畫面高幾多 */
const playerShare = (p) =>
    p.evaluate(
        () =>
            document.querySelector('[class*="panel"]').getBoundingClientRect().height /
            window.innerHeight,
    );

const recordMetrics = async (p, label, rows, share) => {
    const disc = (await p.getByRole('slider', { name: '播放進度' }).boundingBox()).width;
    metrics.push({ label, share: `${(share * 100).toFixed(1)}%`, disc: disc.toFixed(0), rows });
};

/** 清單 panel 見到幾多行：扣走底部 padding（安全區），用第一行嘅真實高度計 */
const visibleRows = (panel) =>
    panel.evaluate((el) => {
        const padding = parseFloat(getComputedStyle(el).paddingBottom);
        const row = el.querySelector('li')?.getBoundingClientRect().height ?? 1;
        return (el.clientHeight - padding) / row;
    });

/** 唱片闊度（同列表行數一齊印出嚟，方便對照） */
const logDiscSize = async (p, label, rows) => {
    const disc = (await p.getByRole('slider', { name: '播放進度' }).boundingBox()).width;
    log(
        disc >= DISC_MIN_PX,
        `${label}：唱片 ${disc.toFixed(0)}px（≥ ${DISC_MIN_PX}），清單 ${rows}`,
    );
};

/** main 可以捲幾多、文件本身有冇溢出（矮畫面要 main 捲、文件唔捲） */
const mainScroll = (p) =>
    p.evaluate(() => {
        const main = document.querySelector('main');
        return {
            main: main.scrollHeight - main.clientHeight,
            doc: document.documentElement.scrollHeight - window.innerHeight,
        };
    });

/** 好矮嘅畫面（橫向手機 / 矮視窗）：唔再固定，改由 main 捲（文件唔捲），清單唔係內部捲動，控制掣捲得到 */
const checkScrollingShowPage = async (p, label, shot) => {
    const list = p.getByRole('region', { name: '集數' }).getByRole('list');
    const inner = await list.evaluate((el) => el.scrollHeight - el.clientHeight);
    log(inner <= 1, `${label}：清單唔係內部捲動（多出 ${inner}px）`);
    await logDiscSize(p, label, '全部（成頁捲）');
    const forward = p.getByRole('button', { name: '前進 60 秒' });
    await forward.scrollIntoViewIfNeeded();
    const b = await forward.boundingBox();
    const scroll = await mainScroll(p);
    const inView = b !== null && b.y >= 0 && b.y + b.height <= p.viewportSize().height;
    log(
        scroll.main > 0 && scroll.doc <= 0 && inView,
        `${label}：main 捲得、文件唔捲、控制掣捲得到（${JSON.stringify(scroll)}）`,
    );
    // 最尾一集都要捲得到
    const last = p.getByRole('region', { name: '集數' }).locator('li button').last();
    await last.scrollIntoViewIfNeeded();
    log(await last.isVisible(), `${label}：捲到最尾一集`);
    await recordMetrics(p, label, '全部（成頁捲）', await playerShare(p));
    await p.screenshot({ path: `${OUT}/${shot}` });
};

/** 返回掣、播放掣同前進掣要完整喺畫面入面 */
const checkControlsInView = async (p, label) => {
    const height = p.viewportSize().height;
    for (const name of ['返回主頁', '後退 60 秒', '前進 60 秒']) {
        const b = await p.getByRole('button', { name }).boundingBox();
        const ok = b !== null && b.y >= 0 && b.y + b.height <= height;
        log(ok, `${label}：「${name}」喺畫面內（y ${b?.y?.toFixed(0)}）`);
    }
};

/** 節目頁同今日節目頁嘅唱片要一樣大（矮螢幕一齊縮） */
const checkDiscMatchesToday = async (p, label) => {
    const discWidth = async () =>
        (await p.getByRole('slider', { name: '播放進度' }).boundingBox()).width;
    // [頁面間距, 播放器 panel 入面間距]（px）
    const pageGaps = () =>
        p.evaluate(() =>
            [document.querySelector('main'), document.querySelector('[class*="panel"]')].map((el) =>
                parseFloat(getComputedStyle(el).rowGap),
            ),
        );
    const show = await discWidth();
    const showGaps = await pageGaps();
    await p.goto(`${BASE}#/today`);
    await p.getByRole('button', { name: '暫停' }).waitFor({ timeout: 5000 });
    const today = await discWidth();
    log(Math.abs(show - today) < 1, `${label}：唱片同今日節目頁一樣大（${show} / ${today}）`);
    // 今日節目頁同節目頁用同一個固定版面（.fixed），頁面間距一樣、矮螢幕一齊收窄；
    // 今日節目卡入面用卡自己較窄嘅間距：要正正係 --card-inner-gap（ShowCardStack .card 蓋過 .fixed），
    // 亦唔可以闊過節目頁
    const todayGaps = await pageGaps();
    // custom property 嘅 computed value 已經代入咗 var()（例如 var(--space-2) → 8px）
    const cardInnerGap = await p.evaluate(() =>
        parseFloat(
            getComputedStyle(document.querySelector('[class*="panel"]')).getPropertyValue(
                '--card-inner-gap',
            ),
        ),
    );
    log(
        todayGaps[0] === showGaps[0] &&
            todayGaps[1] === cardInnerGap &&
            cardInnerGap <= showGaps[1],
        `${label}：今日節目頁頁面間距同節目頁一樣、卡入面間距 = --card-inner-gap ${cardInnerGap}px（${todayGaps.join(' / ')}px，節目頁 ${showGaps.join(' / ')}px）`,
    );
};

// 今日節目清單最少見到一行（固定版面嘅直向尺寸全部斷言）
const TODAY_MIN_ROWS = 1;
const TODAY_ROW_VIEWPORTS = ['320×568', '375×667', '390×664', '390×720', '390×844', '390×562'];

/**
 * 今日節目清單見到幾多行：指定畫面要過 TODAY_MIN_ROWS，其他只印出嚟。
 * 順便記低卡佔高（返回量到嘅比例，畀 checkTodayCardShare 用，唔使再量一次）
 */
const checkTodayRows = async (list, label) => {
    const rows = await visibleRows(list);
    const share = await recordTodayMetrics(list.page(), label, rows.toFixed(2));
    const enforced = TODAY_ROW_VIEWPORTS.some((size) => label.startsWith(size));
    log(
        !enforced || rows >= TODAY_MIN_ROWS,
        `${label}：清單見到約 ${rows.toFixed(2)} 行${enforced ? `（≥ ${TODAY_MIN_ROWS}）` : ''}`,
    );
    return share;
};

/** 今日節目最上面嗰張卡（PlayerPanel 外層，指示點喺入面）佔畫面高幾多 */
const todayCardShare = (p) =>
    p.evaluate(
        () =>
            document
                .querySelector('h1')
                .closest('[class*="panel"]')
                .parentElement.getBoundingClientRect().height / window.innerHeight,
    );

const recordTodayMetrics = async (p, label, rows) => {
    const share = await todayCardShare(p);
    todayMetrics.push({ label, share: `${(share * 100).toFixed(1)}%`, rows });
    return share;
};

/** 固定版面嘅今日節目卡（連指示點）≤ PLAYER_MAX_SHARE；share 由 checkTodayRows 量好傳入 */
const checkTodayCardShare = (share, label) => {
    log(
        share <= PLAYER_MAX_SHARE + 0.001,
        `${label}：今日節目卡佔畫面高 ${(share * 100).toFixed(1)}%（≤ ${PLAYER_MAX_SHARE * 100}%）`,
    );
};

/** 今日節目頁固定：捲輪 / scrollTo 都唔會捲成頁；清單太長就自己捲 */
const checkFixedTodayPage = async (p, label) => {
    const list = p.getByRole('region', { name: '今日節目' }).getByRole('list');
    checkTodayCardShare(await checkTodayRows(list, label), label);
    const card = await p.getByRole('heading', { level: 1 }).boundingBox();
    await p.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
    await p.mouse.wheel(0, WHEEL_PX);
    await p.evaluate(() => window.scrollTo(0, 500));
    await p.waitForTimeout(300);
    const page = await p.evaluate(() => ({
        scrollY: window.scrollY,
        overflow: document.documentElement.scrollHeight - window.innerHeight,
    }));
    log(page.scrollY === 0 && page.overflow <= 0, `${label}：成頁唔捲（${JSON.stringify(page)}）`);
    const extra = await list.evaluate((el) => el.scrollHeight - el.clientHeight);
    const box = await list.boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await p.mouse.wheel(0, WHEEL_PX);
    await p.waitForTimeout(600);
    const scrolled = await list.evaluate((el) => el.scrollTop);
    const after = await p.evaluate(() => window.scrollY);
    log(
        (extra <= 1 || scrolled > 0) && after === 0,
        `${label}：清單自己捲（多出 ${extra}px，scrollTop ${scrolled}，window ${after}）`,
    );
    await checkControlsInView(p, label);
};

/** 好矮嘅畫面：今日節目頁好似節目頁咁由 main 捲，清單唔係內部捲動，控制掣捲得到 */
const checkScrollingTodayPage = async (p, label) => {
    const list = p.getByRole('region', { name: '今日節目' }).getByRole('list');
    const inner = await list.evaluate((el) => el.scrollHeight - el.clientHeight);
    log(inner <= 1, `${label}：清單唔係內部捲動（多出 ${inner}px）`);
    await recordTodayMetrics(p, label, '全部（成頁捲）');
    const forward = p.getByRole('button', { name: '前進 60 秒' });
    // 由節目頁轉過嚟時捲動位置可能停喺半格（-0.5px）位置，scrollIntoViewIfNeeded 會當睇到；直接置中
    await forward.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const b = await forward.boundingBox();
    const scroll = await mainScroll(p);
    const inView = b !== null && b.y >= 0 && b.y + b.height <= p.viewportSize().height;
    log(
        scroll.main > 0 && scroll.doc <= 0 && inView,
        `${label}：main 捲得、文件唔捲、控制掣捲得到（${JSON.stringify(scroll)}）`,
    );
};

/** 拖緊日子條：成條跟住手指郁（track 有 translateX），可以順便影一張拖緊嘅截圖 */
const checkStripFollows = async (p, x, y, shot) => {
    await p.mouse.move(x - STRIP_DRAG_PX, y + 2, { steps: 4 });
    const transform = await p.locator(STRIP).evaluate((el) => el.firstElementChild.style.transform);
    log(/translateX\(-\d/.test(transform), `拖緊日子條成條跟住郁：${transform}`);
    if (shot) await p.screenshot({ path: `${OUT}/${shot}` });
};

/** 喺唱片下面嘅日子條向左掃 → 播放中轉去下一行（舊一集） */
const checkSwipeToOlder = async (p, dragShot) => {
    const rows = p.getByRole('region', { name: '集數' }).locator('li button');
    const labels = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const from = labels.findIndex((l) => l.includes('播放中'));
    const zone = await p.locator(STRIP).boundingBox();
    const y = zone.y + zone.height / 2;
    const x = zone.x + zone.width / 2 + SWIPE_FROM_PX / 2;
    await p.mouse.move(x, y);
    await p.mouse.down();
    await checkStripFollows(p, x, y, dragShot);
    await p.mouse.move(zone.x + zone.width / 2 - SWIPE_FROM_PX / 2, y + 4, { steps: 6 });
    await p.mouse.up();
    await p.waitForTimeout(800);
    const now = await p.locator('button[aria-current="true"]').first().getAttribute('aria-label');
    const olderDate = labels[from + 1]?.split('，')[0];
    log(
        now.startsWith(olderDate) && now.includes('播放中'),
        `向左掃轉舊一集：${labels[from]} → ${now}`,
    );
    const playing = await p.evaluate(() => navigator.mediaSession.playbackState);
    log(playing === 'playing', `掃完即刻播：${playing}`);
};

/** 節目頁頁頭係節目名（唔再係「正在播放」），日子條中間讀「現正播放：日期」 */
const checkShowHeader = async (p, name, label) => {
    const heading = await p.locator('header h1').textContent();
    const stale = await p.getByText('正在播放', { exact: true }).count();
    log(heading === name && stale === 0, `${label}：頁頭係節目名「${heading}」`);
    const line = await p.locator(STRIP).evaluate((el) => {
        const dateId = el.getAttribute('aria-labelledby').split(' ')[0];
        return document.getElementById(dateId).parentElement.textContent;
    });
    log(/^現正播放：\d{2}\/\d{2}（.）$/.test(line), `${label}：日子條讀「${line}」`);
};

/** 日子條側格嘅日期唔可以畀剪走（320px 闊會收埋箭咀） */
const checkSideCellsFit = async (p, label) => {
    const cells = await p
        .locator(`${STRIP} button`)
        .evaluateAll((els) =>
            els.map((e) => ({ text: e.textContent, over: e.scrollWidth - e.clientWidth })),
        );
    log(
        cells.length > 0 && cells.every((c) => c.over <= 0),
        `${label}：日子條側格冇剪走（${cells.map((c) => `${c.text} ${c.over}px`).join(' / ')}）`,
    );
};

/** 主頁固定：喺版面上面捲都唔郁，版本號仍然喺 mini player 上面 */
const checkFixedHome = async (p, label) => {
    await p.mouse.move(p.viewportSize().width / 2, p.viewportSize().height / 3);
    await p.mouse.wheel(0, WHEEL_PX);
    await p.waitForTimeout(300);
    const page = await p.evaluate(() => ({
        scrollY: window.scrollY,
        overflow: document.documentElement.scrollHeight - window.innerHeight,
    }));
    log(
        page.scrollY === 0 && page.overflow <= 0,
        `${label}：主頁成頁唔捲（${JSON.stringify(page)}）`,
    );
    await checkVersionClear(p, label);
};

/** Android 工具列 / PWA 狀態列色（<meta name="theme-color">）要跟頁面色調；轉頁後等 React commit 先讀 */
const checkThemeColor = async (p, expected, label) => {
    const read = () =>
        p
            .locator('meta[name="theme-color"]')
            .evaluateAll((els) => els.map((e) => e.getAttribute('content')));
    const ok = await p
        .waitForFunction(
            (want) => {
                const metas = document.querySelectorAll('meta[name="theme-color"]');
                return metas.length === 1 && metas[0].getAttribute('content') === want;
            },
            expected,
            { timeout: 2000 },
        )
        .then(() => true)
        .catch(() => false);
    log(ok, `${label}：theme-color ${(await read()).join(', ')}（預期 ${expected}）`);
};

const TODAY_STACK = '今日節目，左右掃動轉節目';
// 拖到一半（未到轉節目門檻 30% 卡闊）影相；成個掃動一定過門檻
const TODAY_MID_DRAG_PX = 90;
const TODAY_SWIPE_PX = 260;
// 飛走（--duration-card-fly 280ms）+ 轉節目 render
const TODAY_SETTLE_MS = 600;

// 今日節目卡入面最外嘅控制掣（-60 / +60）同卡邊最少要留幾多 px
const CARD_CONTROL_INSET_PX = 12;

/** 控制掣要完整喺卡入面，同卡邊留返位（唔可以貼住描邊） */
const checkCardControlsInset = async (p, label) => {
    const inset = await p.evaluate(() => {
        // 最上面嗰張卡 = PlayerPanel 嘅外層
        const card = document.querySelector('h1').closest('[class*="panel"]').parentElement;
        const box = card.getBoundingClientRect();
        const left = document.querySelector('[aria-label="後退 60 秒"]').getBoundingClientRect();
        const right = document.querySelector('[aria-label="前進 60 秒"]').getBoundingClientRect();
        return Math.min(left.left - box.left, box.right - right.right);
    });
    log(
        inset >= CARD_CONTROL_INSET_PX,
        `${label} 今日節目卡：控制掣離卡邊 ${inset.toFixed(1)}px（≥ ${CARD_CONTROL_INSET_PX}）`,
    );
};

const horizontalOverflow = (p) =>
    p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** 喺節目名度橫向拖（dx < 0 向左）；唔放手就停喺半途，方便影相 */
const dragTodayCard = async (p, dx, { release = true } = {}) => {
    const h = await p.getByRole('heading', { level: 1 }).boundingBox();
    const y = h.y + h.height / 2;
    const fromX = h.x + h.width / 2 - dx / 2;
    await p.mouse.move(fromX, y);
    await p.mouse.down();
    await p.mouse.move(fromX + dx, y + 4, { steps: 8 });
    if (!release) return;
    await p.mouse.up();
    await p.waitForTimeout(TODAY_SETTLE_MS);
};

/** 卡疊而家嘅節目：標題、指示點 aria-current、theme-color 三樣都要跟 */
const checkTodayShow = async (p, name, bg, label) => {
    const heading = await p.getByRole('heading', { level: 1 }).textContent();
    const dot = await p.locator('[data-page-dot][aria-current="true"]').getAttribute('aria-label');
    log(heading === name && dot === name, `${label}：${heading}（指示點 ${dot}）`);
    await checkThemeColor(p, bg, label);
};

const MINI_REGION = '正在播放（今日節目）';
const MINI_SWIPE_PX = 160;

/** 喺主頁 mini player 中間橫掃（正數 = 向右 = 上一個） */
const swipeMiniPlayer = async (p, dx) => {
    const box = await p.getByRole('region', { name: MINI_REGION }).boundingBox();
    const y = box.y + box.height / 2;
    const fromX = box.x + box.width / 2 - dx / 2;
    await p.mouse.move(fromX, y);
    await p.mouse.down();
    await p.mouse.move(fromX + dx, y + 4, { steps: 8 });
    await p.mouse.up();
    await p.waitForTimeout(300);
};

/** mini player 指示點：全部節目名同 aria-current 嗰個 */
const miniDots = async (p) => {
    const dots = p.getByRole('region', { name: MINI_REGION }).locator('[data-page-dot]');
    const labels = await dots.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const current = await dots.and(p.locator('[aria-current="true"]')).getAttribute('aria-label');
    return { labels, current };
};

/** 主頁 mini player 掃過頭會循環：第一個向右掃去最後一個，最後一個向左掃返第一個 */
const checkMiniPlayerLoop = async (p) => {
    const { labels, current } = await miniDots(p);
    const first = labels[0];
    const last = labels[labels.length - 1];
    log(labels.length > 1 && current === first, `mini player 由第一個節目開始：${current}`);
    await swipeMiniPlayer(p, MINI_SWIPE_PX);
    const wrappedBack = (await miniDots(p)).current;
    log(wrappedBack === last, `mini player 第一個向右掃循環去最後一個：${wrappedBack}`);
    await swipeMiniPlayer(p, -MINI_SWIPE_PX);
    const wrappedForward = (await miniDots(p)).current;
    log(wrappedForward === first, `mini player 最後一個向左掃循環返第一個：${wrappedForward}`);
    // 掃完個 click 要被食咗，唔可以跳咗去節目頁
    log(!p.url().includes('#/show'), `mini player 掃完仲喺主頁：${p.url()}`);
};

/** 拖到一半：最上面張卡跟手指、傾斜；後面張卡上前；頁面冇橫向捲動 */
const checkTodayMidDrag = async (p) => {
    await dragTodayCard(p, -TODAY_MID_DRAG_PX, { release: false });
    const pose = await p.getByRole('group', { name: TODAY_STACK }).evaluate((el) => ({
        phase: el.dataset.phase,
        dx: el.style.getPropertyValue('--card-dx'),
        rotate: el.style.getPropertyValue('--card-rotate'),
        forward: Number(el.style.getPropertyValue('--card-forward')),
        behind: el.querySelectorAll('[inert]').length,
    }));
    log(
        pose.phase === 'dragging' && pose.rotate !== '0deg' && pose.forward > 0 && pose.behind > 0,
        `今日節目拖到一半：卡跟手指傾斜、後面張卡上前 ${JSON.stringify(pose)}`,
    );
    log((await horizontalOverflow(p)) === 0, '今日節目拖動中冇橫向捲動');
    await p.screenshot({ path: `${OUT}/5b-today-mid-drag.png` });
    // 停咗（影相）先放手：唔算甩，又未過門檻 → 彈返，唔轉節目
    const before = await p.getByRole('heading', { level: 1 }).textContent();
    await p.mouse.up();
    await p.waitForTimeout(TODAY_SETTLE_MS);
    const after = await p.getByRole('heading', { level: 1 }).textContent();
    const phase = await p.getByRole('group', { name: TODAY_STACK }).getAttribute('data-phase');
    log(after === before && phase === null, `拖唔夠遠放手彈返：${before} → ${after}`);
};

const server = await startPreview();
let browser;
try {
    browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        colorScheme: 'dark',
    });
    // 模擬真實 audio server 嘅 Range 支援（206 Partial Content），seek 先會成功
    const serveAudio = (route) => {
        const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range ?? '');
        const start = range ? Number(range[1]) : 0;
        const end = range && range[2] ? Number(range[2]) : wav.length - 1;
        route.fulfill({
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
    await context.route('https://audio.hkfm903.live/**', serveAudio);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(BASE);
    await page.waitForSelector('nav[aria-busy="false"]');
    await page.screenshot({ path: `${OUT}/1-home.png` });
    const tiles = await page
        .locator('nav button')
        .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? e.textContent));
    log(tiles.length === 6 && tiles[5] === '今日節目', `主頁 6 粒掣：${tiles.join(' | ')}`);
    const cols = await page.evaluate(
        () => getComputedStyle(document.querySelector('nav')).gridTemplateColumns.split(' ').length,
    );
    log(cols === 2, `主頁每行 ${cols} 粒`);
    await checkThemeColor(page, HOME_TOP, '主頁');
    await checkFixedHome(page, '390×844 主頁');

    const mini = page.getByRole('region', { name: '正在播放（今日節目）' });
    log(
        (await mini.textContent()).includes('在晴朗的一天出發'),
        `主頁 mini player 顯示今日第一個節目：${await mini.textContent()}`,
    );
    await page.getByRole('button', { name: '公子會', exact: true }).click();
    await page.getByRole('button', { name: '暫停' }).waitFor({ timeout: 5000 });
    log(page.url().endsWith('#/show/gongzi'), `轉到節目頁並自動播放：${page.url()}`);
    await checkShowHeader(page, '公子會', '公子會節目頁');
    const currentEpisode = () =>
        page.locator('button[aria-current="true"]').first().getAttribute('aria-label');
    const current = await currentEpisode();
    log(current.startsWith('播放 17/10'), `揀中最近一集（今日之前）：${current}`);
    const accent = await page.evaluate(() =>
        getComputedStyle(document.querySelector('[data-theme-scope]')).getPropertyValue(
            '--theme-accent',
        ),
    );
    log(accent.trim() === '#d4af5a', `節目頁用公子會色調：${accent}`);
    await checkThemeColor(page, GONGZI_BG, '公子會節目頁');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/2-show-playing.png` });

    const slider = page.getByRole('slider', { name: '播放進度' });
    const box = await slider.boundingBox();
    const at = (vx, vy) => [box.x + (vx / 300) * box.width, box.y + (vy / 300) * box.height];
    await page.mouse.move(...at(150, 10));
    await page.mouse.down();
    await page.mouse.move(...at(60, 40), { steps: 5 });
    await page.mouse.move(...at(10, 150), { steps: 5 });
    await page.screenshot({ path: `${OUT}/3-show-dragging.png` });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const afterDrag = Number(await slider.getAttribute('aria-valuenow'));
    log(
        Math.abs(afterDrag - 100) <= 3,
        `拖弧形 slider 去左邊 → ${afterDrag}s（預期約 100s / 600s）`,
    );

    await page.getByRole('button', { name: '前進 60 秒' }).click();
    const afterSkip = Number(await slider.getAttribute('aria-valuenow'));
    log(afterSkip >= 158 && afterSkip <= 165, `前進 60 秒 → ${afterSkip}s`);

    await slider.focus();
    await page.keyboard.press('End');
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /^播放 10\/10/ }).click();
    await page.waitForTimeout(800);
    const row17 = await page
        .getByRole('button', { name: /^播放 17\/10/ })
        .getAttribute('aria-label');
    log(row17.endsWith('已收聽'), `聽到尾嘅 17/10 顯示已收聽：${row17}`);
    const sel = await currentEpisode();
    log(sel.startsWith('播放 10/10'), `撳集數轉集：${sel}`);
    const visible = await page.locator('button[aria-current="true"]').first().isVisible();
    log(visible, '揀中集數喺畫面內');
    await page.screenshot({ path: `${OUT}/4-show-date-changed.png` });

    await page.getByRole('button', { name: '前進 30 秒' }).click();
    await page.getByRole('button', { name: '暫停' }).click();
    const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('903player:progress:v1')),
    );
    const entry = Object.entries(saved).find(([u]) => u.includes('20261010'));
    log(entry && entry[1].position >= 29, `暫停時存低進度：${entry?.[1].position.toFixed(1)}s`);

    await page.getByRole('button', { name: '返回主頁' }).click();
    log(page.url().endsWith('#/'), '返回主頁');
    await checkThemeColor(page, HOME_TOP, '返回主頁');
    await page.getByRole('button', { name: '公子會', exact: true }).click();
    await page.waitForTimeout(800);
    const resumed = await currentEpisode();
    log(
        resumed.startsWith('播放 17/10'),
        `再入節目頁：揀返最近一集 ${resumed}（17/10 已聽過 → 由頭播）`,
    );
    const restartPos = Number(await slider.getAttribute('aria-valuenow'));
    log(restartPos <= 3, `已聽過嘅集由頭播：${restartPos}s`);
    const watched17 = () =>
        page.evaluate(
            () =>
                Object.entries(JSON.parse(localStorage.getItem('903player:progress:v1'))).find(
                    ([u]) => u.includes('20261017'),
                )[1].watched,
        );
    log(await watched17(), '重播頭幾秒仍然保留已收聽');
    // 真正播超過 REPLAY_RESET_SECONDS（10 秒）先清走已收聽
    await page.waitForTimeout(11000);
    log(!(await watched17()), '重播超過 10 秒清走已收聽');
    await page.getByRole('button', { name: /^播放 10\/10/ }).click();
    await page.waitForTimeout(800);
    const replayed = await page
        .getByRole('button', { name: /^播放 17\/10/ })
        .getAttribute('aria-label');
    log(/聽到 0:1\d$/.test(replayed), `重播超過 10 秒後清單顯示聽到：${replayed}`);
    const resumePos = Number(await slider.getAttribute('aria-valuenow'));
    log(resumePos >= 29, `未聽完嘅 10/10 續播：${resumePos}s`);

    await page.getByRole('button', { name: '返回主頁' }).click();
    await page.waitForTimeout(300);
    const oldEpisodeState = await page.evaluate(() => navigator.mediaSession.playbackState);
    log(oldEpisodeState === 'paused', `播緊舊集返主頁會暫停：${oldEpisodeState}`);
    await page.getByRole('button', { name: '今日節目', exact: true }).click();
    await page.getByRole('button', { name: '暫停' }).waitFor({ timeout: 5000 });
    await page.waitForTimeout(1000);
    const items = await page
        .getByRole('region', { name: '今日節目' })
        .locator('li button')
        .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    log(items.length === 3, `今日節目列表：${items.join(' | ')}`);
    const heading = await page.getByRole('heading', { level: 1 }).textContent();
    log(heading === '在晴朗的一天出發', `今日自動播第一個節目：${heading}`);
    await checkThemeColor(page, SUNNYDAY_BG, '今日節目（在晴朗的一天出發）');
    await page.screenshot({ path: `${OUT}/5-today.png` });
    await checkTodayMidDrag(page);
    // 卡疊次序：在晴朗的一天出發 → Bad Girl大過佬 → 雲妮鍾情 → 循環返第一個
    await dragTodayCard(page, -TODAY_SWIPE_PX);
    await checkTodayShow(page, 'Bad Girl大過佬', BADGIRL_BG, '今日節目向左掃轉下一個');
    await dragTodayCard(page, TODAY_SWIPE_PX);
    await checkTodayShow(page, '在晴朗的一天出發', SUNNYDAY_BG, '今日節目向右掃返上一個');
    await dragTodayCard(page, TODAY_SWIPE_PX);
    await checkTodayShow(page, '雲妮鍾情', WANNI_BG, '今日節目第一個向右掃循環去最後');
    await dragTodayCard(page, -TODAY_SWIPE_PX);
    await checkTodayShow(page, '在晴朗的一天出發', SUNNYDAY_BG, '今日節目最後一個向左掃循環返第一');
    await dragTodayCard(page, -TODAY_SWIPE_PX);
    await checkTodayShow(page, 'Bad Girl大過佬', BADGIRL_BG, '今日節目再向左掃');
    log((await horizontalOverflow(page)) === 0, '今日節目掃完冇橫向捲動');
    const playingAfterSwipes = await page.evaluate(() => navigator.mediaSession.playbackState);
    log(playingAfterSwipes === 'playing', `掃卡轉節目即刻播：${playingAfterSwipes}`);
    await page.getByRole('button', { name: /播放 雲妮鍾情/ }).click();
    await page.waitForTimeout(500);
    log(
        (await page.getByRole('heading', { level: 1 }).textContent()) === '雲妮鍾情',
        '撳節目掣轉播',
    );
    await page.screenshot({ path: `${OUT}/6-today-switched.png` });

    await page.goBack();
    await page.waitForTimeout(500);
    const backState = await page.evaluate(() => navigator.mediaSession.playbackState);
    const miniText = await page.getByRole('region', { name: '正在播放（今日節目）' }).textContent();
    log(
        page.url().endsWith('#/') && backState === 'playing' && miniText.includes('雲妮鍾情'),
        `播緊今日節目用返回手勢返主頁會繼續播，mini player 顯示：${backState} / ${miniText}`,
    );
    await checkVersionClear(page, '390×844');
    await page.screenshot({ path: `${OUT}/7-home-mini-player.png` });

    const narrow = await browser.newContext({ viewport: { width: 320, height: 640 } });
    await narrow.route('https://audio.hkfm903.live/**', serveAudio);
    const np = await narrow.newPage();
    await np.goto(BASE);
    await np.waitForSelector('nav[aria-busy="false"]');
    await checkVersionClear(np, '320×640');
    await np.screenshot({ path: `${OUT}/8-home-version-320.png` });
    for (const route of ['#/show/gongzi', '#/today']) {
        await np.goto(`${BASE}${route}`);
        await np.getByRole('button', { name: '前進 60 秒' }).waitFor();
        const overflow = await np.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        log(overflow === 0, `320px 闊冇橫向捲動（${route}，超出 ${overflow}px）`);
    }
    await narrow.close();

    // 主頁 mini player 循環掃：獨立 context，未載入任何節目
    const loop = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await loop.route('https://audio.hkfm903.live/**', serveAudio);
    const lpp = await loop.newPage();
    lpp.on('pageerror', (e) => errors.push(e.message));
    await lpp.goto(BASE);
    await lpp.waitForSelector('nav[aria-busy="false"]');
    await checkMiniPlayerLoop(lpp);
    await loop.close();

    // 細 iPhone（320×568）：今日節目卡疊靜止嘅樣
    const small = await browser.newContext({
        viewport: { width: 320, height: 568 },
        deviceScaleFactor: 2,
        colorScheme: 'dark',
    });
    await small.route('https://audio.hkfm903.live/**', serveAudio);
    const sp = await small.newPage();
    sp.on('pageerror', (e) => errors.push(e.message));
    await sp.goto(`${BASE}#/today`);
    await sp.getByRole('button', { name: '暫停' }).waitFor({ timeout: 5000 });
    await sp.waitForTimeout(800);
    log((await horizontalOverflow(sp)) === 0, '320×568 今日節目冇橫向捲動');
    await checkCardControlsInset(sp, '320×568');
    await sp.screenshot({ path: `${OUT}/5c-today-320x568.png` });
    await dragTodayCard(sp, -TODAY_SWIPE_PX / 2);
    await checkTodayShow(sp, 'Bad Girl大過佬', BADGIRL_BG, '320×568 今日節目向左掃');
    log((await horizontalOverflow(sp)) === 0, '320×568 今日節目掃完冇橫向捲動');
    await small.close();

    // 主頁頁頂橫額：常見手機闊度（細 iPhone、一般、Pro Max）
    for (const { width, height } of HOME_BANNER_VIEWPORTS) {
        const ctx = await browser.newContext({
            viewport: { width, height },
            deviceScaleFactor: 2,
            colorScheme: 'dark',
        });
        await ctx.route('https://audio.hkfm903.live/**', serveAudio);
        const hp = await ctx.newPage();
        hp.on('pageerror', (e) => errors.push(e.message));
        await hp.goto(BASE);
        await hp.waitForSelector('nav[aria-busy="false"]');
        await hp.getByRole('region', { name: '正在播放（今日節目）' }).waitFor();
        await checkHomeBanner(hp, `${width}×${height} 主頁`, `home-banner-${width}x${height}.png`);
        await ctx.close();
    }

    // 節目頁：夠高就固定、集數清單自己捲；好矮（橫向手機）就成頁正常捲。badgirl 集數多過一個畫面
    for (const { width, height, swipe, homeFixed } of SHOW_VIEWPORTS) {
        const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
        await ctx.route('https://audio.hkfm903.live/**', serveAudio);
        const fp = await ctx.newPage();
        fp.on('pageerror', (e) => errors.push(e.message));
        await fp.goto(`${BASE}#/show/badgirl`);
        await fp.getByRole('button', { name: '暫停' }).waitFor({ timeout: 5000 });
        await fp.waitForTimeout(800);
        const label = `${width}×${height} 節目頁`;
        const shot = `show-${width}x${height}.png`;
        await checkShowHeader(fp, 'Bad Girl大過佬', label);
        await checkSideCellsFit(fp, label);
        if (swipe) {
            await checkSwipeToOlder(fp, width === 390 ? 'show-strip-dragging.png' : null);
            // 掃去舊一集之後兩邊都有隔籬集：連左邊「新一集」側格都量埋
            await checkSideCellsFit(fp, `${label}（掃完，兩邊都有）`);
        }
        if (height > SHORT_HEIGHT_PX) await checkFixedShowPage(fp, label, shot);
        else await checkScrollingShowPage(fp, label, shot);
        await checkDiscMatchesToday(fp, label);
        // checkDiscMatchesToday 之後已經喺今日節目頁：同樣夠高就固定，好矮就成頁捲
        const todayLabel = `${width}×${height} 今日節目頁`;
        await fp.waitForTimeout(500);
        if (height > SHORT_HEIGHT_PX) await checkFixedTodayPage(fp, todayLabel);
        else await checkScrollingTodayPage(fp, todayLabel);
        await fp.screenshot({ path: `${OUT}/today-${width}x${height}.png` });
        if (homeFixed) {
            await fp.goto(BASE);
            await fp.waitForSelector('nav[aria-busy="false"]');
            await checkFixedHome(fp, `${width}×${height} 主頁`);
            await fp.screenshot({ path: `${OUT}/home-${width}x${height}.png` });
        }
        await ctx.close();
    }
    console.log('\n節目頁尺寸｜播放器佔高｜唱片｜清單行數');
    for (const m of metrics) console.log(`${m.label}｜${m.share}｜${m.disc}px｜${m.rows}`);
    console.log('\n今日節目頁尺寸｜卡（連指示點）佔高｜清單行數');
    for (const m of todayMetrics) console.log(`${m.label}｜${m.share}｜${m.rows}`);
    console.log('');

    // 真手指（CDP touch）：成頁唔捲、清單自己捲、卡 / 日子條 / mini player 掃得郁
    await runTouchChecks({ browser, base: BASE, out: OUT, serveAudio, errors, log });

    const light = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        colorScheme: 'light',
    });
    const lp = await light.newPage();
    await lp.goto(BASE);
    await lp.waitForSelector('nav[aria-busy="false"]');
    await lp.screenshot({ path: `${OUT}/7-home-light.png` });

    // 靜靜雞更新靠 registration.update()：build 出嚟嘅 sw.js 要註冊到同啟用
    const swScript = await lp.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        return registration.active?.scriptURL ?? '';
    });
    log(swScript.endsWith('/903-player/sw.js'), `Service worker 已啟用：${swScript}`);

    log(errors.length === 0, `冇 JS error ${errors.join('; ')}`);
} finally {
    await browser?.close();
    server.kill();
}
console.log(failures === 0 ? '\nAll E2E checks passed' : `\n${failures} E2E check(s) failed`);
process.exitCode = failures === 0 ? 0 : 1;
