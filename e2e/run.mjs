// 端對端測試：真 Chromium + vite preview + 假錄音列表 + 模擬 audio server（支援 Range）
// 固定時鐘同 audio host 見 harness.mjs
// 用法：npm run e2e（截圖輸出去 e2e/screenshots/）
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { chromium } from 'playwright';
import { runArcSheetChecks } from './arcSheet.mjs';
import { runHiddenPlaybackChecks } from './hiddenPlayback.mjs';
import { runDramaPageChecks } from './dramaPages.mjs';
import {
    AUDIO_HOST,
    PROBE_STORAGE_KEY,
    SHOT,
    ensurePlaying,
    waitForPlaybackState,
    externalRequests,
    newE2EContext,
} from './harness.mjs';
import { SAMPLE_RECORDINGS } from './sampleData.mjs';
import { runMiniPlayerRuleChecks } from './miniPlayerRules.mjs';
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
mkdirSync(OUT, { recursive: true });

// 預期色：刻意寫死做獨立對照（同下面 '#d4af5a' 一樣），唔係由 app 推返出嚟
const HOME_TOP = '#4f749c'; // HOME_THEME.bg（主頁漸變頂色）
const GONGZI_BG = '#111111'; // SHOW_THEMES.gongzi.bg
const SUNNYDAY_BG = '#0e2230'; // SHOW_THEMES.sunnyday.bg
const BADGIRL_BG = '#21151a'; // SHOW_THEMES.badgirl.bg
const WANNI_BG = '#1c1c1e'; // SHOW_THEMES.wanni.bg
const APP_VERSION_TEXT = `v${JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version}`;

let failures = 0;
/** 全集表第一下撳被食咗幾多次（CUI-0010）：唔算 FAIL，但結尾要見到 */
let sheetMissedTaps = 0;
const log = (ok, msg) => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
};

/** port 有冇人用緊：有就即刻停，唔好 poll 到第二個 worktree 嘅 preview，誤測人哋嘅 build（S-549） */
const assertPortFree = () =>
    new Promise((resolve) => {
        const probe = createServer();
        probe.once('error', () => {
            console.error(
                `port ${PORT} 有人用緊（可能係另一個 worktree 嘅 e2e），用 E2E_PORT 揀第二個`,
            );
            process.exit(1);
        });
        probe.listen(PORT, () => probe.close(resolve));
    });

const startPreview = async () => {
    await assertPortFree();
    // 直接用 node 行 vite（唔經 npx），kill 先會停到真正嘅 server
    const viteBin = new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname;
    const server = spawn(
        process.execPath,
        [viteBin, 'preview', '--port', String(PORT), '--strictPort'],
        { stdio: 'ignore' },
    );
    for (let i = 0; i < 30; i += 1) {
        // vite 自己退出（例如 strictPort 撞 port）就唔使再等
        if (server.exitCode !== null) break;
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

const BANNER_ALT = '903 叱咤 Player：隨時隨地，音樂・節目・一click 即聽';

/** index.html 嘅啟動畫面：顯示 package.json 版本，app render 完之後淡出再由 DOM 移走 */
const checkSplashRemoved = async (p) => {
    const splash = p.locator('#splash');
    const removed = await splash
        .waitFor({ state: 'detached', timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
    log(removed, `啟動畫面 render 完已經移走`);
};

/** index.html 用嘅 Poppins 字重（css2 網址 wght@400;500;600）；harness 由 @fontsource/poppins 本機供應 */
const POPPINS_WEIGHTS = [400, 500, 600];

/**
 * 頁頭標題、日子條、mini player 跑馬燈嘅「冇剪走 / 有冇超出」斷言靠字型度量：
 * 拉丁字 / 數字要用真 Poppins（比 fallback 闊），否則會 false negative（W-497）。
 * document.fonts.load 回傳真係載入咗嘅 FontFace：冇 @font-face 就係空；字型檔 404 會 reject（NetworkError），
 * 當冇載入計，照出 FAIL 而唔係成個 run crash（CUI-0009）
 */
const checkPoppinsLoaded = async (p, label) => {
    const loaded = await p.evaluate(async (weights) => {
        await document.fonts.ready;
        const results = await Promise.all(
            weights.map(async (w) => {
                const faces = await document.fonts
                    .load(`${w} 16px Poppins`, 'Ag 0123')
                    .catch(() => []);
                const ok =
                    faces.some((f) => f.status === 'loaded') &&
                    document.fonts.check(`${w} 16px Poppins`, 'Ag 0123');
                return ok ? null : w;
            }),
        );
        return results.filter((w) => w !== null);
    }, POPPINS_WEIGHTS);
    log(
        loaded.length === 0,
        `${label}：Poppins ${POPPINS_WEIGHTS.join(' / ')} 都載入咗（${loaded.length ? `冇：${loaded.join(' / ')}` : '全部 loaded'}）`,
    );
};

/** 版本號喺主頁橫額右下角：見到、成個喺橫額圖入面、喺圖右下嗰一半，唔係標題嘅一部分 */
const checkVersionOnBanner = async (p, label) => {
    // 限 #root：啟動畫面淡出期間 #splash 都有同一個版本號
    const version = p.locator('#root').getByText(APP_VERSION_TEXT, { exact: true });
    const v = await version.boundingBox();
    const b = await p.getByRole('img', { name: BANNER_ALT }).boundingBox();
    const inside =
        v !== null &&
        b !== null &&
        v.x >= b.x &&
        v.y >= b.y &&
        v.x + v.width <= b.x + b.width &&
        v.y + v.height <= b.y + b.height;
    const corner = inside && v.x > b.x + b.width / 2 && v.y > b.y + b.height / 2;
    const heading = await p.getByRole('heading', { level: 1 }).textContent();
    log(
        (await version.isVisible()) && corner && !heading.includes(APP_VERSION_TEXT),
        `${label}：版本號 ${APP_VERSION_TEXT} 喺橫額右下角（${v?.x?.toFixed(0)}, ${v?.y?.toFixed(0)}）`,
    );
};

// 橫額高度 / 節目格高度比較時容許 subpixel 捨入
const BANNER_HEIGHT_TOLERANCE_PX = 1;
// 390×844、320×568 嘅主頁固定 / 版本號已經由 SHOW_VIEWPORTS（homeFixed）嘅 checkFixedHome 檢查；
// 430×932 唔喺嗰度，所以喺橫額呢度補做（fixedHome）
const HOME_BANNER_VIEWPORTS = [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 430, height: 932, fixedHome: true },
];

/** 節目格嘅 token（tokens.css :root）：最矮比例 16:9 同直版一行最多高幾多倍（T8），同 app 讀同一組 */
const readTileTokens = (p) =>
    p.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        const token = (name) => parseFloat(style.getPropertyValue(name));
        return {
            ratio: token('--tile-aspect-h') / token('--tile-aspect-w'),
            maxGrow: token('--show-tile-max-grow'),
        };
    });

/**
 * 橫額同節目格嘅高（T8 直版填滿）：橫額唔郁，高 = 一欄闊 × 16:9（同最矮嘅節目格一樣）；
 * 節目格行高由 ShowGrid fillRows 拉高，喺最矮（× 1）同最高（× maxGrow）之間。
 * b = 橫額 boundingBox 加 visible（見唔見到）
 */
const checkBannerHeight = async (p, label, b, tile) => {
    const { ratio, maxGrow } = await readTileTokens(p);
    const minTilePx = tile.width * ratio;
    const maxTilePx = minTilePx * maxGrow;
    log(
        b.visible && Math.abs(b.height - minTilePx) <= BANNER_HEIGHT_TOLERANCE_PX,
        `${label}：橫額高 ${b.height.toFixed(2)}px = 一欄 16:9 格高 ${minTilePx.toFixed(2)}px`,
    );
    log(
        tile.height >= minTilePx - BANNER_HEIGHT_TOLERANCE_PX &&
            tile.height <= maxTilePx + BANNER_HEIGHT_TOLERANCE_PX,
        `${label}：節目格高 ${tile.height.toFixed(2)}px 喺 ${minTilePx.toFixed(2)}–${maxTilePx.toFixed(2)}px`,
    );
};

/** 主頁頁頂橫額嘅幾何：見到、高度跟 T8 規則、喺節目格上面對齊、有圓角、冇令頁面橫向捲動 */
const checkHomeBanner = async (p, label, shot) => {
    const banner = p.getByRole('heading', { level: 1 }).getByRole('img', { name: BANNER_ALT });
    await banner.evaluate((img) => img.decode());
    const b = await banner.boundingBox();
    const tile = await p.locator('nav button').first().boundingBox();
    const radius = await banner.evaluate((img) => parseFloat(getComputedStyle(img).borderRadius));
    await checkBannerHeight(p, label, { ...b, visible: await banner.isVisible() }, tile);
    log(
        Math.abs(b.x - tile.x) < 1 && b.y + b.height < tile.y,
        `${label}：橫額喺節目格上面、左邊對齊（${b.x} / ${tile.x}）`,
    );
    log(radius > 0, `${label}：橫額有圓角（${radius}px）`);
    log((await horizontalOverflow(p)) === 0, `${label}：冇橫向捲動`);
    await p.screenshot({ ...SHOT, path: `${OUT}/${shot}` });
};

// 今日有新一集嘅節目格讀屏名後面加「，今日有新一集」（i18n home.showNew），比較節目名時去走
const NEW_SUFFIX = /，今日有新一集$/;
const tileName = (label) => label.replace(NEW_SUFFIX, '');

const HOME_TILES = [
    'Bad Girl大過佬',
    '公子會',
    '雲妮鍾情',
    '在晴朗的一天出發',
    '西加航空',
    '口水多過浪花',
    '聖艾粒LaLaLaLa',
    '今日節目',
];
// 節目頁矮螢幕最少見到三集（tokens.css --player-reserved-height 預留三行）
const MIN_VISIBLE_ROWS = 3;
/** 唱片底嘅由頭播放掣（播放 / 暫停掣喺佢隔籬） */
const RESTART = '由頭播放';
/** 唱片底嘅播放 / 暫停掣（錨定成個名，唔會撞到集數行嘅「播放 19/10…」） */
const PLAY_TOGGLE = /^(播放|暫停)$/;
// tokens.css 嘅 --player-max-share（0.6）係設計目標；用戶接受 62–66%，
// 所以 e2e 只要求節目頁播放器同今日節目播放器（卡 → 指示點）≤ 66%，實際比例照印出嚟
const PLAYER_MAX_SHARE = 0.66;
const STRIP_DRAG_PX = 60;
const STRIP = '[aria-roledescription="轉集"]';
/** 每個節目頁尺寸量到嘅播放器高度比例、唱片闊度、清單行數（最尾印成表） */
const metrics = [];
/** 今日節目頁：播放器（卡 → 指示點）佔高、清單行數 */
const todayMetrics = [];
const WHEEL_PX = 400;
const SWIPE_FROM_PX = 120;
// 同 tokens.css 嘅 --player-disc-min 一致：預設 160px，好矮（≤ SHORT_HEIGHT_PX）120px
const DISC_MIN_PX = 160;
const SHORT_DISC_MIN_PX = 120;
// 好矮嘅畫面都係固定版面：清單最少見到一行（再矮過 SHORT_ROWS_MIN_HEIGHT_PX 只印出嚟，例如 568×320）
const SHORT_MIN_VISIBLE_ROWS = 1;
const SHORT_ROWS_MIN_HEIGHT_PX = 390;
// SHORT_HEIGHT_PX 要同 tokens.css 嘅 @media (max-height) 一樣（src/styles/shortHeightBreakpoint.node.test.ts）：
// 以下唱片下限細啲、預留行數少啲，播放器佔高唔要求 ≤ PLAYER_MAX_SHARE；任何高度都係固定版面
// 用 regex 讀呢一行，所以保持 `const SHORT_HEIGHT_PX = <數字>;` 嘅寫法
const SHORT_HEIGHT_PX = 561;
// 橫版（打橫而且 ≥ 640px 闊）：同 src/config/layout.ts 嘅 LANDSCAPE_QUERY 一樣；
// 左清單（連頁頭）、右播放器，唔出日子條，唱片按右欄計（同今日節目頁唔一定一樣大），播放器唔受六成上限
const LANDSCAPE_MIN_WIDTH_PX = 640;
const isLandscape = (p) => {
    const { width, height } = p.viewportSize();
    return width > height && width >= LANDSCAPE_MIN_WIDTH_PX;
};

const SHOW_VIEWPORTS = [
    { width: 390, height: 844, swipe: true, homeFixed: true },
    { width: 320, height: 568, swipe: true, homeFixed: true, pagedHome: true },
    // 用戶截圖嘅尺寸：主頁分頁、節目名縮字
    { width: 291, height: 494, homeFixed: true, pagedHome: true },
    // 常見手機（iPhone SE / 細 Android / 有工具列嘅 Safari）
    { width: 390, height: 720 },
    { width: 375, height: 667 },
    { width: 390, height: 664 },
    // 橫版：手機打橫（主頁橫額入格 5 欄 × 2 行）、細視窗、iPad 打橫（主頁橫額成行 + 4 欄）
    { width: 844, height: 390, homeFixed: true, landscapeHome: true },
    // iPhone SE 打橫：最窄，今日節目頁頁頭要放得落標題同指示點
    { width: 667, height: 375 },
    { width: 960, height: 640, homeFixed: true, landscapeHome: true },
    { width: 1180, height: 820, homeFixed: true, landscapeHome: true },
    // 568 闊未夠橫版（< 640px），照直版矮螢幕；1280×400 係矮嘅橫版
    { width: 568, height: 320 },
    { width: 1280, height: 400 },
    { width: 390, height: 540 },
    // 矮螢幕斷點兩邊：560 預留兩行、唱片下限 120；562 預留三行、唱片下限 160
    { width: 390, height: 560 },
    { width: 390, height: 562 },
];

/**
 * 矮螢幕主頁（分頁）：有頁數指示點；第一頁每格都完整喺節目格範圍入面（冇剪走）、喺 mini player 上面；
 * 撳最後一點轉到最後一頁，見到「今日節目」格；成頁唔捲
 */
const checkPagedHome = async (p, label) => {
    const nav = p.getByRole('navigation', { name: '節目' });
    const dots = nav.getByRole('group', { name: /^節目第 1 頁，共 \d+ 頁$/ });
    const hasDots = (await dots.count()) === 1;
    log(hasDots, `${label}：節目格分頁，有頁數指示點`);
    if (!hasDots) return;
    const fit = await p.evaluate(() => {
        const navBox = document.querySelector('nav').getBoundingClientRect();
        const mini = document.querySelector('[aria-label="正在播放（今日節目）"]');
        const miniTop = mini ? mini.getBoundingClientRect().top : innerHeight;
        const scroller = document.querySelector('nav > div');
        const page = scroller.getBoundingClientRect();
        const firstPage = [...scroller.firstElementChild.children].map((el) =>
            el.getBoundingClientRect(),
        );
        return firstPage.every(
            (b) =>
                b.top >= navBox.top &&
                b.bottom <= navBox.bottom &&
                b.bottom <= miniTop &&
                b.left >= page.left - 0.5 &&
                b.right <= page.right + 0.5,
        );
    });
    log(fit, `${label}：第一頁節目格冇剪走、冇畀 mini player 遮住`);
    await dots.getByRole('button').last().click();
    await p.waitForTimeout(600);
    const today = await nav.getByRole('button', { name: '今日節目', exact: true }).boundingBox();
    const navBox = await nav.boundingBox();
    log(
        today !== null &&
            today.x >= navBox.x - 0.5 &&
            today.x + today.width <= navBox.x + navBox.width + 0.5,
        `${label}：撳最後一點轉到最後一頁，見到今日節目格`,
    );
    const page = await p.evaluate(() => ({
        scrollY: window.scrollY,
        main: document.querySelector('main').scrollTop,
    }));
    log(page.scrollY === 0 && page.main === 0, `${label}：主頁成頁唔捲（${JSON.stringify(page)}）`);
};

/**
 * 橫版主頁：唔分頁（冇頁數指示點），8 格全部完整喺畫面、喺 mini player 上面；
 * 手機打橫橫額入節目格（nav 入面），其他橫版橫額成行喺節目格上面、用闊版圖
 */
const checkLandscapeHome = async (p, label) => {
    const nav = p.getByRole('navigation', { name: '節目' });
    log((await nav.getByRole('group').count()) === 0, `${label}：唔分頁，冇頁數指示點`);
    const fit = await p.evaluate(
        ({ names, suffix }) => {
            const mini = document.querySelector('[aria-label="正在播放（今日節目）"]');
            const miniTop = mini ? mini.getBoundingClientRect().top : innerHeight;
            const nav = document.querySelector('nav');
            return [...nav.querySelectorAll('button')]
                .filter((b) =>
                    names.includes(
                        (b.getAttribute('aria-label') ?? b.textContent).replace(suffix, ''),
                    ),
                )
                .map((b) => b.getBoundingClientRect())
                .filter(
                    (r) =>
                        r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= miniTop,
                ).length;
        },
        { names: HOME_TILES, suffix: NEW_SUFFIX },
    );
    log(
        fit === HOME_TILES.length,
        `${label}：${fit} / ${HOME_TILES.length} 格完整喺畫面、mini player 上面`,
    );
    const banner = p.getByRole('img', { name: BANNER_ALT });
    const inGrid = (await nav.getByRole('img', { name: BANNER_ALT }).count()) === 1;
    const phone = p.viewportSize().height <= SHORT_HEIGHT_PX;
    const src = await banner.evaluate((img) => img.currentSrc);
    log(
        phone ? inGrid : !inGrid && /banner-wide/.test(src),
        `${label}：${phone ? '橫額入節目格' : '橫額成行、用闊版圖'}（${src.split('/').pop()}）`,
    );
    log((await horizontalOverflow(p)) === 0, `${label}：冇橫向捲動`);
};

/** 節目頁固定：捲集數 panel 時 window 唔郁、控制掣仍然喺畫面，panel 自己嘅 scrollTop 有變 */
const checkFixedShowPage = async (p, label, shot) => {
    const panel = p.getByRole('region', { name: '集數' }).getByRole('list');
    const before = await panel.evaluate((el) => el.scrollTop);
    const box = await panel.boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await p.mouse.wheel(0, WHEEL_PX);
    await p.waitForTimeout(600);
    const after = await panel.evaluate((el) => el.scrollTop);
    // 矮過 SHORT_ROWS_MIN_HEIGHT_PX（例如 568×320）清單得返幾 px 高，只印出嚟
    const tiny = p.viewportSize().height < SHORT_ROWS_MIN_HEIGHT_PX;
    log(
        tiny || after !== before,
        `${label}：集數 panel 自己捲（scrollTop ${before} → ${after}）${tiny ? '（太矮，只印出）' : ''}`,
    );
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
    const height = p.viewportSize().height;
    const short = height <= SHORT_HEIGHT_PX;
    const minRows = short ? SHORT_MIN_VISIBLE_ROWS : MIN_VISIBLE_ROWS;
    const enforced = !short || height >= SHORT_ROWS_MIN_HEIGHT_PX;
    log(
        !enforced || rows >= minRows,
        `${label}：清單見到約 ${rows.toFixed(2)} 行${enforced ? `（≥ ${minRows}）` : ''}`,
    );
    await logDiscSize(p, label, rows.toFixed(2));
    const share = await playerShare(p);
    log(
        short || isLandscape(p) || share <= PLAYER_MAX_SHARE + 0.001,
        `${label}：播放器佔畫面高 ${(share * 100).toFixed(1)}%${short || isLandscape(p) ? '' : `（≤ ${PLAYER_MAX_SHARE * 100}%）`}`,
    );
    await recordMetrics(p, label, rows.toFixed(2), share);
    await p.screenshot({ ...SHOT, path: `${OUT}/${shot}` });
};

/** 播放器（PlayerPanel：唱片連弧 → 日子條）佔畫面高幾多 */
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

/** 唱片闊度（同列表行數一齊印出嚟，方便對照）；好矮嘅畫面下限細啲 */
const logDiscSize = async (p, label, rows) => {
    const disc = (await p.getByRole('slider', { name: '播放進度' }).boundingBox()).width;
    const min = p.viewportSize().height <= SHORT_HEIGHT_PX ? SHORT_DISC_MIN_PX : DISC_MIN_PX;
    log(disc >= min - 0.5, `${label}：唱片 ${disc.toFixed(0)}px（≥ ${min}），清單 ${rows}`);
};

/** 返回掣、由頭播放掣同播放掣要完整喺畫面入面 */
const checkControlsInView = async (p, label) => {
    const height = p.viewportSize().height;
    for (const name of ['返回主頁', RESTART, PLAY_TOGGLE]) {
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
    await ensurePlaying(p);
    const today = await discWidth();
    // 橫版唱片按右欄計，今日節目頁要扣卡同指示點，所以只要求唔大過節目頁
    const landscape = isLandscape(p);
    log(
        landscape ? today <= show + 0.5 : Math.abs(show - today) < 1,
        `${label}：唱片${landscape ? '（橫版）唔大過節目頁' : '同今日節目頁一樣大'}（${show} / ${today}）`,
    );
    // 今日節目頁同節目頁用同一個固定版面（.fixed），頁面間距一樣、矮螢幕一齊收窄；
    // 今日節目卡入面用卡自己較窄嘅間距：要正正係 --card-inner-gap（ShowCardStack .card 蓋過 .fixed），
    // 亦唔可以闊過節目頁
    const todayGaps = await pageGaps();
    // custom property 嘅 computed value 只係代入咗 var()（例如 calc(8px * 1)），
    // 放喺一個 probe 嘅 width 度由瀏覽器計成 px
    const cardInnerGap = await p.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.width = 'var(--card-inner-gap)';
        document.querySelector('[class*="panel"]').append(probe);
        const width = probe.getBoundingClientRect().width;
        probe.remove();
        return width;
    });
    log(
        todayGaps[0] === showGaps[0] &&
            todayGaps[1] === cardInnerGap &&
            cardInnerGap <= showGaps[1],
        `${label}：今日節目頁頁面間距同節目頁一樣、卡入面間距 = --card-inner-gap ${cardInnerGap}px（${todayGaps.join(' / ')}px，節目頁 ${showGaps.join(' / ')}px）`,
    );
};

// 今日節目清單最少見到兩行（固定版面嘅直向尺寸全部斷言；播放掣搬入卡之後騰出位）
const TODAY_MIN_ROWS = 2;
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

/**
 * 今日節目播放器佔畫面高幾多：最上面嗰張卡（PlayerCard 外層）頂 → 卡疊 + 指示點一組（.todayPlayer）底
 * （播放掣喺卡入面；指示點喺卡外）
 */
const todayCardShare = (p) =>
    p.evaluate((titleSelector) => {
        const card = document.querySelector(titleSelector).closest('[class*="panel"]');
        const top = card.parentElement.getBoundingClientRect().top;
        const player = document.querySelector('[class*="todayPlayer"]');
        return (player.getBoundingClientRect().bottom - top) / window.innerHeight;
    }, TODAY_CARD_TITLE);

const recordTodayMetrics = async (p, label, rows) => {
    const share = await todayCardShare(p);
    // 距 PLAYER_MAX_SHARE 上限仲有幾多 px（負數 = 超出；好矮嘅畫面唔要求）
    const headroom = (PLAYER_MAX_SHARE - share) * p.viewportSize().height;
    todayMetrics.push({
        label,
        share: `${(share * 100).toFixed(1)}%`,
        headroom: `${headroom.toFixed(1)}px`,
        rows,
    });
    return share;
};

/** 固定版面嘅今日節目播放器（卡 → 指示點）≤ PLAYER_MAX_SHARE；share 由 checkTodayRows 量好傳入 */
const checkTodayCardShare = (share, label, short) => {
    log(
        short || share <= PLAYER_MAX_SHARE + 0.001,
        `${label}：今日節目卡佔畫面高 ${(share * 100).toFixed(1)}%（≤ ${PLAYER_MAX_SHARE * 100}%）`,
    );
};

/** 今日節目頁固定：捲輪 / scrollTo 都唔會捲成頁；清單太長就自己捲 */
const checkFixedTodayPage = async (p, label) => {
    const list = p.getByRole('region', { name: '節目表' }).getByRole('list');
    // 橫版播放器喺右欄，唔受六成上限（同矮螢幕一樣只印出）
    const short = p.viewportSize().height <= SHORT_HEIGHT_PX || isLandscape(p);
    checkTodayCardShare(await checkTodayRows(list, label), label, short);
    // 手機打橫指示點搬咗上頁頭：標題仍然完整顯示（冇省略號）
    const heading = await p.locator('header h1').evaluate((el) => ({
        fits: el.scrollWidth <= el.clientWidth,
        size: getComputedStyle(el).fontSize,
    }));
    log(heading.fits, `${label}：頁頭標題完整顯示（字體 ${heading.size}）`);
    const card = await todayCardTitle(p).boundingBox();
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
    const tiny = p.viewportSize().height < SHORT_ROWS_MIN_HEIGHT_PX;
    log(
        (tiny || extra <= 1 || scrolled > 0) && after === 0,
        `${label}：清單自己捲（多出 ${extra}px，scrollTop ${scrolled}，window ${after}）${tiny ? '（太矮，清單只印出）' : ''}`,
    );
    await checkControlsInView(p, label);
};

/** 拖緊日子條：成條跟住手指郁（track translateX 加咗負數位移），可以順便影一張拖緊嘅截圖 */
const checkStripFollows = async (p, x, y, shot) => {
    await p.mouse.move(x - STRIP_DRAG_PX, y + 2, { steps: 4 });
    const transform = await p.locator(STRIP).evaluate((el) => el.firstElementChild.style.transform);
    log(/-\s?\d[\d.]*px\)\)$/.test(transform), `拖緊日子條成條跟住郁：${transform}`);
    if (shot) await p.screenshot({ ...SHOT, path: `${OUT}/${shot}` });
};

/** 日子條入面某一日（「轉去 20/10（二）」）嘅中心離日子條中心幾遠（px） */
const dayOffset = async (p, dayMonth) => {
    const zone = await p.locator(STRIP).boundingBox();
    const day = await p.locator(`${STRIP} button[aria-label^="轉去 ${dayMonth}"]`).boundingBox();
    return day.x + day.width / 2 - (zone.x + zone.width / 2);
};

/** 喺唱片下面嘅日子條向左拖，將下一行（舊一集）嗰日拖入正中 → 播放中轉去嗰集 */
const checkSwipeToOlder = async (p, dragShot) => {
    const rows = p.getByRole('region', { name: '集數' }).locator('li button');
    const labels = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const from = labels.findIndex((l) => l.includes('播放中'));
    // 去走行首動作（播放 / 暫停），淨低「日/月 星期X」
    const olderDate = labels[from + 1]?.split('，')[0].replace(/^(播放|暫停) /, '');
    const distance = await dayOffset(p, olderDate.split(' ')[0]);
    const zone = await p.locator(STRIP).boundingBox();
    const y = zone.y + zone.height / 2;
    const x = zone.x + zone.width / 2 + distance / 2;
    await p.mouse.move(x, y);
    await p.mouse.down();
    await checkStripFollows(p, x, y, dragShot);
    await p.mouse.move(x - distance, y + 4, { steps: 6 });
    await p.mouse.up();
    await p.waitForTimeout(800);
    const now = await p.locator('button[aria-current="true"]').first().getAttribute('aria-label');
    log(
        now.includes(` ${olderDate}，`) && now.includes('播放中'),
        `向左拖轉舊一集：${labels[from]} → ${now}`,
    );
    const playing = await waitForPlaybackState(p, 'playing');
    log(playing === 'playing', `拖完即刻播：${playing}`);
};

/** 節目頁頁頭係節目名（唔再係「正在播放」），日子條上面得「現正播放」，現正播放嗰日喺正中 */
const checkShowHeader = async (p, name, label) => {
    const heading = await p.locator('header h1').textContent();
    const stale = await p.getByText('正在播放', { exact: true }).count();
    log(heading === name && stale === 0, `${label}：頁頭係節目名「${heading}」`);
    // 節目名按畫面闊度縮字，一行完整顯示（冇省略號）
    const title = await p.locator('header h1').evaluate((el) => ({
        fits: el.scrollWidth <= el.clientWidth,
        size: getComputedStyle(el).fontSize,
    }));
    log(title.fits, `${label}：節目名完整顯示（字體 ${title.size}）`);
    if (isLandscape(p)) {
        const hidden = !(await p.locator(STRIP).isVisible());
        log(hidden, `${label}：橫版唔出日子條（轉集用左欄清單）`);
        // 頁頭同集數清單喺左邊，唱片喺右邊，唱片下面有「現正播放」
        const list = await p.getByRole('region', { name: '集數' }).boundingBox();
        const head = await p.locator('header h1').boundingBox();
        const disc = await p.getByRole('slider', { name: '播放進度' }).boundingBox();
        const now = await p
            .getByText(/^現正播放：/)
            .first()
            .boundingBox();
        log(
            list.x + list.width <= disc.x && head.x < disc.x && now.y > disc.y,
            `${label}：橫版左清單（${list.x.toFixed(0)}）、右唱片（${disc.x.toFixed(0)}），現正播放喺唱片下面`,
        );
        return;
    }
    const { above, date, centreGap } = await p.locator(STRIP).evaluate((el) => {
        const dateId = el.getAttribute('aria-labelledby').split(' ')[0];
        const zone = el.getBoundingClientRect();
        const cell = el.querySelector('[aria-current="date"]').getBoundingClientRect();
        return {
            above: el.previousElementSibling?.textContent,
            date: document.getElementById(dateId).textContent,
            centreGap: cell.x + cell.width / 2 - (zone.x + zone.width / 2),
        };
    });
    log(
        above === '現正播放' && /^\d{2}\/\d{2}（.）$/.test(date) && Math.abs(centreGap) < 1,
        `${label}：日子條上面「${above}」、正中「${date}」（偏離 ${centreGap.toFixed(2)}px）`,
    );
};

/** 日子條每格（星期 + 日/月）唔可以畀剪走（320px 闊一格得約 41px） */
const checkDayCellsFit = async (p, label) => {
    if (isLandscape(p)) return;
    const cells = await p
        .locator(`${STRIP} > div > *`)
        .evaluateAll((els) =>
            els
                .filter((e) => e.textContent)
                .map((e) => ({ text: e.textContent, over: e.scrollWidth - e.clientWidth })),
        );
    const clipped = cells.filter((c) => c.over > 0);
    log(
        cells.length > 0 && clipped.length === 0,
        `${label}：日子條 ${cells.length} 格冇剪走（${clipped.map((c) => `${c.text} ${c.over}px`).join(' / ') || '全部啱位'}）`,
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
    await checkVersionOnBanner(p, label);
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
/** 卡疊最上面嗰張卡嘅節目名（h1 係頁頭「今日節目」，卡入面係 h2）；畀 page.evaluate 用 */
const TODAY_CARD_TITLE = '[role="group"] h2';
/** 卡疊而家嘅節目名 */
const todayCardTitle = (p) =>
    p.getByRole('group', { name: TODAY_STACK }).getByRole('heading', { level: 2 });
// 拖到一半（未到轉節目門檻 30% 卡闊）影相；成個掃動一定過門檻
const TODAY_MID_DRAG_PX = 90;
const TODAY_SWIPE_PX = 260;
// 飛走（--duration-card-fly 280ms）+ 轉節目 render
const TODAY_SETTLE_MS = 600;

const horizontalOverflow = (p) =>
    p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** 喺節目名度橫向拖（dx < 0 向左）；唔放手就停喺半途，方便影相 */
const dragTodayCard = async (p, dx, { release = true } = {}) => {
    const h = await todayCardTitle(p).boundingBox();
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
    const heading = await todayCardTitle(p).textContent();
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
    await p.screenshot({ ...SHOT, path: `${OUT}/5b-today-mid-drag.png` });
    // 停咗（影相）先放手：唔算甩，又未過門檻 → 彈返，唔轉節目
    const before = await todayCardTitle(p).textContent();
    await p.mouse.up();
    await p.waitForTimeout(TODAY_SETTLE_MS);
    const after = await todayCardTitle(p).textContent();
    const phase = await p.getByRole('group', { name: TODAY_STACK }).getAttribute('data-phase');
    log(after === before && phase === null, `拖唔夠遠放手彈返：${before} → ${after}`);
};

/*
 * W-390：iOS standalone 嘅 dvh 可能高過真正嘅固定殼（html / body / #root 100%）。
 * Chromium 冇呢個 bug，所以人手將殼（html）縮矮 shrink px，100dvh 仍然係成個 viewport：
 * 主碟跟殼高（100cqh）就會縮細，清單最少行數、控制掣、main 唔溢出都要守得住。
 * 對照組：將 --player-shell-height 強制改返 100dvh（即舊做法），同一個殼要真係出事，
 * 證明呢個模擬真係會令舊公式爆，唔係無論點都過。
 * shrink 要大到舊公式會剪走（390×844 主碟本身封頂 300px，要縮多啲先見到），
 * 又唔可以矮到連最細唱片都塞唔落最少行數。
 */
const SHELL_MISMATCH_CASES = [
    { width: 390, height: 844, shrink: 160 },
    { width: 375, height: 667, shrink: 80 },
];
const SHELL_PAGES = [
    { route: '#/show/badgirl', region: '集數', minRows: MIN_VISIBLE_ROWS, name: '節目頁' },
    { route: '#/today', region: '節目表', minRows: TODAY_MIN_ROWS, name: '今日節目頁' },
];
// 對照組用嘅舊做法：主碟跟 dvh（W-390 之前）
const DVH_SOURCE_CSS = ':root { --player-shell-height: 100dvh !important; }';
const LAYOUT_SETTLE_MS = 300;
/** 殼縮矮後嘅量度：殼高、100dvh、唱片、清單行數、控制掣係咪喺 main 入面、main 有冇溢出 */
const shellFit = async (p, region) => {
    const rows = await visibleRows(p.getByRole('region', { name: region }).getByRole('list'));
    const layout = await p.evaluate(() => {
        const main = document.querySelector('main');
        const box = main.getBoundingClientRect();
        const probe = document.createElement('div');
        probe.style.cssText = 'position:fixed;top:0;height:100dvh;visibility:hidden';
        document.body.append(probe);
        const dvh = probe.getBoundingClientRect().height;
        probe.remove();
        // 由頭播放掣嘅 parent 係唱片底成排掣（由頭播放 + 播放 / 暫停）
        const restart = document.querySelector('[aria-label="由頭播放"]');
        const controls = [
            document.querySelector('[aria-label="返回主頁"]'),
            restart.parentElement,
        ].every((el) => {
            const b = el.getBoundingClientRect();
            return b.top >= box.top && b.bottom <= box.bottom + 0.5;
        });
        return {
            shell: document.getElementById('root').getBoundingClientRect().height,
            dvh,
            disc: document.querySelector('[aria-label="播放進度"]').getBoundingClientRect().width,
            controls,
            overflow: main.scrollHeight - main.clientHeight,
        };
    });
    return { ...layout, rows };
};
/** shellFit 結果守唔守得住：清單最少行數、控制掣喺 main 入面、main 唔溢出（固定版面） */
const shellHolds = (fit, minRows) => fit.rows >= minRows && fit.controls && fit.overflow <= 0;
const describeFit = (fit) =>
    `殼 ${fit.shell.toFixed(0)}px / 100dvh ${fit.dvh.toFixed(0)}px，唱片 ${fit.disc.toFixed(0)}px，清單 ${fit.rows.toFixed(2)} 行，控制掣喺 main 入面 ${fit.controls}，main 溢出 ${fit.overflow}px`;
/** 每個殼縮矮情況量到嘅結果（最尾印成表） */
const shellMetrics = [];

const checkShellMismatch = async (browser, errors) => {
    for (const { width, height, shrink } of SHELL_MISMATCH_CASES) {
        const ctx = await newE2EContext(browser, {
            viewport: { width, height },
            deviceScaleFactor: 2,
        });
        const sp = await ctx.newPage();
        sp.on('pageerror', (e) => errors.push(e.message));
        for (const { route, region, minRows, name } of SHELL_PAGES) {
            await sp.goto(`${BASE}${route}`);
            await ensurePlaying(sp);
            await sp.waitForTimeout(800);
            const label = `${width}×${height} ${name}（殼矮 ${shrink}px）`;
            const normal = await shellFit(sp, region);
            const shrunk = await sp.addStyleTag({
                content: `html { height: calc(100% - ${shrink}px) !important; }`,
            });
            await sp.waitForTimeout(LAYOUT_SETTLE_MS);
            const fit = await shellFit(sp, region);
            log(
                Math.abs(fit.dvh - fit.shell - shrink) < 1,
                `${label}：模擬到 dvh 高過殼 ${(fit.dvh - fit.shell).toFixed(0)}px`,
            );
            log(
                shellHolds(fit, minRows) && fit.disc < normal.disc,
                `${label}：唱片跟殼高縮細（${normal.disc.toFixed(0)} → ${fit.disc.toFixed(0)}px），清單 ≥ ${minRows} 行、控制掣喺 main 入面、main 唔溢出（${describeFit(fit)}）`,
            );
            const legacy = await sp.addStyleTag({ content: DVH_SOURCE_CSS });
            await sp.waitForTimeout(LAYOUT_SETTLE_MS);
            const dvhFit = await shellFit(sp, region);
            log(
                !shellHolds(dvhFit, minRows),
                `${label} 對照：舊做法（唱片跟 100dvh）真係會出事（${describeFit(dvhFit)}）`,
            );
            await sp.screenshot({
                ...SHOT,
                path: `${OUT}/shell-mismatch-dvh-${width}x${height}-${name}.png`,
            });
            await legacy.evaluate((el) => el.remove());
            await sp.waitForTimeout(LAYOUT_SETTLE_MS);
            await sp.screenshot({
                ...SHOT,
                path: `${OUT}/shell-mismatch-${width}x${height}-${name}.png`,
            });
            await shrunk.evaluate((el) => el.remove());
            shellMetrics.push({ label, normal, fit, dvhFit });
        }
        await ctx.close();
    }
    console.log(
        '\n殼縮矮情況｜唱片（正常 → 跟殼 / 跟 dvh）｜清單行數（跟殼 / 跟 dvh）｜main 溢出（跟殼 / 跟 dvh）',
    );
    for (const { label, normal, fit, dvhFit } of shellMetrics) {
        console.log(
            `${label}｜${normal.disc.toFixed(0)} → ${fit.disc.toFixed(0)} / ${dvhFit.disc.toFixed(0)}px｜${fit.rows.toFixed(2)} / ${dvhFit.rows.toFixed(2)}｜${fit.overflow} / ${dvhFit.overflow}px`,
        );
    }
    console.log('');
};

/*
 * S-421：成頁 .scope 而家係 size container（W-390）。如果瀏覽器對 container-type 加埋 layout containment，
 * .scope 會變成 position: fixed 嘅 containing block，主頁 mini player 就會跟 .scope（殼）而唔係 viewport 定位。
 * 正常畫面：mini player 浮喺頁底，底 = innerHeight − 8（--space-2，Chromium 冇安全區）。
 * 殼縮矮（同 checkShellMismatch 一樣模擬 dvh 高過殼）：底唔可以出咗 viewport，亦唔可以高過殼底 − 8。
 */
const MINI_BOTTOM_GAP_PX = 8;
const MINI_POSITION_CASES = [
    { width: 390, height: 844, shrink: 160 },
    { width: 320, height: 568, shrink: 80 },
];
const SUBPIXEL_PX = 0.5;
/** 主頁 mini player 外層（ThemeScope wrapper，position: fixed）嘅底、innerHeight、殼底 */
const miniPosition = (p) =>
    p.getByRole('region', { name: MINI_REGION }).evaluate((el) => ({
        bottom: el.closest('[data-theme-scope]').getBoundingClientRect().bottom,
        inner: window.innerHeight,
        shell: document.getElementById('root').getBoundingClientRect().bottom,
    }));

const checkMiniPlayerPosition = async (browser, errors) => {
    for (const { width, height, shrink } of MINI_POSITION_CASES) {
        const ctx = await newE2EContext(browser, {
            viewport: { width, height },
            deviceScaleFactor: 2,
        });
        const mp = await ctx.newPage();
        mp.on('pageerror', (e) => errors.push(e.message));
        await mp.goto(BASE);
        await mp.waitForSelector('nav[aria-busy="false"]');
        await mp.getByRole('region', { name: MINI_REGION }).waitFor();
        const label = `${width}×${height} 主頁 mini player`;
        const normal = await miniPosition(mp);
        log(
            Math.abs(normal.bottom - (normal.inner - MINI_BOTTOM_GAP_PX)) <= SUBPIXEL_PX,
            `${label}：底 ${normal.bottom.toFixed(1)} = innerHeight ${normal.inner} − ${MINI_BOTTOM_GAP_PX}`,
        );
        await mp.addStyleTag({
            content: `html { height: calc(100% - ${shrink}px) !important; }`,
        });
        await mp.waitForTimeout(LAYOUT_SETTLE_MS);
        const shrunk = await miniPosition(mp);
        log(
            shrunk.bottom <= shrunk.inner + SUBPIXEL_PX &&
                shrunk.bottom >= shrunk.shell - MINI_BOTTOM_GAP_PX - SUBPIXEL_PX,
            `${label}（殼矮 ${shrink}px）：底 ${shrunk.bottom.toFixed(1)} ≤ innerHeight ${shrunk.inner}，≥ 殼底 ${shrunk.shell.toFixed(1)} − ${MINI_BOTTOM_GAP_PX}`,
        );
        await ctx.close();
    }
};

/*
 * 窄螢幕（291×562，用戶實機尺寸）嘅三個版面問題：
 * 1. 長時間（例如 1:14:04）唔可以疊住由頭播放掣 / 播放掣
 * 2. mini player 嘅字唔可以疊住播放掣；放唔落就跑馬燈
 * 3. 今日節目卡向右拖，露出嚟嗰張後面嘅卡見到節目名（同向左拖一樣）
 */
const NARROW = { width: 291, height: 562 };
// 測試用嘅長時間（真錄音約兩粒鐘）：直接改字，量版面
const LONG_TIMES = ['1:14:04', '1:54:19'];
// 拖一半（未到轉節目門檻）
const NARROW_HALF_DRAG_PX = 100;
// 等跑馬燈捲咗一段先量位移
const MARQUEE_START_WAIT_MS = 2500;

/** 時間字嘅框同由頭播放 / 播放掣有冇橫向重疊（重疊 px，0 = 冇） */
const timeOverlap = (p) =>
    p.evaluate((times) => {
        const spans = [...document.querySelectorAll('[class*="time"] > span')];
        spans.forEach((span, i) => (span.textContent = times[i]));
        const buttons = [
            ...document.querySelector('[aria-label="由頭播放"]').parentElement.children,
        ].map((b) => b.getBoundingClientRect());
        return Math.max(
            0,
            ...spans.flatMap((span) => {
                const t = span.getBoundingClientRect();
                return buttons.map((b) => Math.min(t.right, b.right) - Math.max(t.left, b.left));
            }),
        );
    }, LONG_TIMES);

/** mini player 嘅名 / 副題框右邊有冇過咗播放掣左邊；副題有冇捲 */
const miniTextFit = (p) =>
    p.evaluate((region) => {
        const mini = document.querySelector(`[aria-label="${region}"]`);
        const toggle = mini.querySelector('button[aria-label="播放"], button[aria-label="暫停"]');
        const boxes = [...mini.querySelectorAll('[class*="box"]')];
        const track = boxes[1].firstElementChild;
        return {
            gap:
                toggle.getBoundingClientRect().left -
                Math.max(...boxes.map((b) => b.getBoundingClientRect().right)),
            overflow: boxes[1].hasAttribute('data-overflow'),
            shift: new DOMMatrix(getComputedStyle(track).transform).m41,
        };
    }, MINI_REGION);

/** 拖緊卡時後面嗰張卡（depth1）嘅節目名透明度 */
const behindTitleOpacity = (p) =>
    p.evaluate(() => {
        const ghosts = [...document.querySelectorAll('[class*="depth1"] [class*="title"]')];
        return Number(getComputedStyle(ghosts[0]).opacity);
    });

const checkNarrowLayout = async (browser, errors) => {
    const ctx = await newE2EContext(browser, { viewport: NARROW, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    const label = `${NARROW.width}×${NARROW.height}`;
    for (const [route, name] of [
        ['#/show/badgirl', '節目頁'],
        ['#/today', '今日節目頁'],
    ]) {
        await p.goto(`${BASE}${route}`);
        await ensurePlaying(p);
        const overlap = await timeOverlap(p);
        log(
            overlap <= 0,
            `${label} ${name}：長時間 ${LONG_TIMES.join(' / ')} 唔疊住掣（重疊 ${overlap.toFixed(1)}px）`,
        );
        await p.screenshot({
            ...SHOT,
            path: `${OUT}/narrow-long-times-${route.replace(/\W/g, '')}.png`,
        });
    }
    for (const dx of [-NARROW_HALF_DRAG_PX, NARROW_HALF_DRAG_PX]) {
        await p.goto(`${BASE}#/today`);
        await ensurePlaying(p);
        await dragTodayCard(p, dx, { release: false });
        const opacity = await behindTitleOpacity(p);
        const side = dx < 0 ? '左' : '右';
        log(
            opacity > 0,
            `${label} 今日節目卡向${side}拖一半：後面嗰張卡見到節目名（opacity ${opacity.toFixed(2)}）`,
        );
        await p.screenshot({
            ...SHOT,
            path: `${OUT}/narrow-today-drag-${dx < 0 ? 'left' : 'right'}.png`,
        });
        await p.mouse.up();
    }
    await p.goto(BASE);
    // 播緊先有時間（「· 0:01 / 10:00」），副題喺 291px 闊放唔落
    const mini = p.getByRole('region', { name: MINI_REGION });
    await mini.getByRole('button', { name: '播放', exact: true }).click();
    // 跑馬燈捲動時有一份 aria-hidden 副本，攞第一份
    await mini.getByText(/ \/ /).first().waitFor();
    await p.waitForTimeout(MARQUEE_START_WAIT_MS);
    const fit = await miniTextFit(p);
    log(
        fit.gap >= 0 && fit.overflow && fit.shift < 0,
        `${label} 主頁 mini player：字唔疊住播放掣（相距 ${fit.gap.toFixed(1)}px），副題放唔落就跑馬燈（捲咗 ${fit.shift.toFixed(1)}px）`,
    );
    await p.screenshot({ ...SHOT, path: `${OUT}/narrow-mini-marquee.png` });
    await ctx.close();
};

/*
 * iOS standalone 嘅 viewport 矮過螢幕（實機約 55px）：模擬 navigator.standalone + screen.height 高過 innerHeight。
 * iOS 唔會喺 viewport 以下畫內容（實機推落去會畀剪走），所以 mini player 仍然喺 viewport 入面、掛喺 body。
 * Chromium 嘅 env(safe-area-inset-bottom) 永遠係 0，扣減安全區留白（--mini-player-inset-bottom）呢度驗唔到
 */
const IOS_VIEWPORT_GAP_PX = 55;
const fakeIosStandalone = (gap) => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    Object.defineProperty(screen, 'height', {
        get: () => window.innerHeight + gap,
        configurable: true,
    });
};

const checkMiniPlayerViewportGap = async (browser, errors) => {
    const ctx = await newE2EContext(browser, {
        viewport: { width: 390, height: 797 },
        deviceScaleFactor: 2,
    });
    await ctx.addInitScript(fakeIosStandalone, IOS_VIEWPORT_GAP_PX);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(BASE);
    await p.waitForSelector('nav[aria-busy="false"]');
    await p.getByRole('region', { name: MINI_REGION }).waitFor();
    const { bottom, inner } = await miniPosition(p);
    // getBoundingClientRect 唔計 overflow 剪裁：另外確認掛喺 body（唔喺 #root 入面畀佢剪走）
    const inBody = await p
        .getByRole('region', { name: MINI_REGION })
        .evaluate((el) => el.closest('[data-theme-scope]').parentElement === document.body);
    log(inBody, `iOS standalone：mini player 掛喺 body（跟 viewport 定位）`);
    log(
        Math.abs(bottom - (inner - MINI_BOTTOM_GAP_PX)) <= SUBPIXEL_PX,
        `iOS standalone viewport 矮 ${IOS_VIEWPORT_GAP_PX}px：mini player 底 ${bottom.toFixed(1)} = innerHeight ${inner} − ${MINI_BOTTOM_GAP_PX}（唔會推出 viewport 畀人剪走）`,
    );
    await ctx.close();
};

// audio probe（PR #29）：回看期內、storage 未有嘅節目會直接 probe 原站。
// 西加航空只喺星期六播（src/config/shows.ts 嘅 airDays），假資料（sampleData.mjs）就只有平日嗰幾集，
// 所以 17/10（六）一定喺回看期內、storage 又未有，一定會 probe
// 同 src/config/shows.ts 嘅 westair 一致；刻意寫死做獨立對照
const PROBE_SHOW = { id: 'westair', name: '西加航空', fileTime: '0905' };
const PROBE_DATE = '2026-10-17';
const PROBE_WAIT_MS = 20000;
const PROBE_POLL_MS = 100;

/**
 * 同 app 嘅 buildAudioUrl 一樣砌法：<host>/<節目名>/<YYYYMMDD>_<HHMM>_<節目名>.aac。
 * 檔名部分嘅節目名空格變底線（Bad Girl大過佬 → Bad_Girl大過佬），資料夾部分照用原名：
 * 同 src/services/audioProbe.ts 嘅 fileShowName 一樣
 */
const probeUrl = ({ name, fileTime }, date) =>
    `${AUDIO_HOST}/${encodeURIComponent(name)}/${encodeURIComponent(
        `${date.replaceAll('-', '')}_${fileTime}_${name.replace(/ /g, '_')}`,
    )}.aac`;
/** 2026-10-16 → 16/10（集數掣 aria-label 嘅寫法） */
const dayMonth = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
/** probe 自己搵到嘅（唔計 harness seed 落 storage 嘅假資料） */
const SAMPLE_URLS = new Set(SAMPLE_RECORDINGS.map((r) => r.url));
const probedOnly = (found) => found.filter((r) => !SAMPLE_URLS.has(r.url));
const sampleLatestDate = (showId) =>
    SAMPLE_RECORDINGS.filter((r) => r.showId === showId)
        .map((r) => r.date)
        .sort()
        .at(-1);

/** 開節目頁，等 probe 寫低某個節目某日嘅結果（found 或者 miss） */
const openProbedShowPage = async (browser, errors, extraAudioUrls) => {
    const ctx = await newE2EContext(
        browser,
        { viewport: { width: 390, height: 844 } },
        { extraAudioUrls },
    );
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(`${BASE}#/show/${PROBE_SHOW.id}`);
    const slot = `${PROBE_SHOW.id}:${PROBE_DATE}`;
    await p.waitForFunction(
        ({ key, slot: wanted, showId, date }) => {
            const state = JSON.parse(localStorage.getItem(key) ?? 'null');
            return (
                state?.misses?.[wanted] !== undefined ||
                state?.found?.some((r) => r.showId === showId && r.date === date)
            );
        },
        { key: PROBE_STORAGE_KEY, slot, showId: PROBE_SHOW.id, date: PROBE_DATE },
        { timeout: PROBE_WAIT_MS, polling: PROBE_POLL_MS },
    );
    const state = await p.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)),
        PROBE_STORAGE_KEY,
    );
    return { ctx, p, state };
};

/** 清單行掣嘅動作：播緊嗰行係「暫停」，其他係「播放」 */
const ROW_ACTION = '(?:播放|暫停)';

const currentEpisodeOf = (p) =>
    p.locator('button[aria-current="true"]').first().getAttribute('aria-label');

/** 原站冇嘅檔（404）唔會變成集數；節目頁最近一集同假資料一樣 */
const checkProbeIgnoresUnknown = async (browser, errors) => {
    const { ctx, p, state } = await openProbedShowPage(browser, errors, []);
    const probed = probedOnly(state.found);
    log(
        probed.length === 0,
        `probe 原站冇嘅日子唔會多咗集數（found ${probed.length}，miss ${Object.keys(state.misses).join(' ')}）`,
    );
    const latest = dayMonth(sampleLatestDate(PROBE_SHOW.id));
    // 重開先計：一入頁揀集嗰陣 probe 未完；重開會即刻併埋之前 probe 到嘅（如果有）
    await p.reload();
    await p
        .getByRole('button', { name: new RegExp(`^${ROW_ACTION} ${latest}`) })
        .first()
        .waitFor();
    const current = await currentEpisodeOf(p);
    log(
        new RegExp(`^${ROW_ACTION} ${latest}`).test(current),
        `西加航空節目頁最近一集 = 假資料最近一集 ${latest}：${current}`,
    );
    const probedLabel = `${ROW_ACTION} ${dayMonth(PROBE_DATE)}`;
    const invented = await p.getByRole('button', { name: new RegExp(`^${probedLabel}`) }).count();
    log(invented === 0, `西加航空冇 probe 作出嚟嘅 ${dayMonth(PROBE_DATE)}（${invented} 個）`);
    await ctx.close();
};

/** 原站真係有、storage 未有嘅新一集：probe 搵到就加入清單，重開節目頁揀佢做最近一集 */
const checkProbeFindsNewEpisode = async (browser, errors) => {
    const url = probeUrl(PROBE_SHOW, PROBE_DATE);
    const { ctx, p, state } = await openProbedShowPage(browser, errors, [url]);
    const found = probedOnly(state.found).map((r) => `${r.showId} ${r.date}`);
    log(
        found.length === 1 && found[0] === `${PROBE_SHOW.id} ${PROBE_DATE}`,
        `probe 搵到原站有嘅新一集，冇其他（${found.join(' / ')}）`,
    );
    const label = `${ROW_ACTION} ${dayMonth(PROBE_DATE)}`;
    const row = p.getByRole('button', { name: new RegExp(`^${label}`) });
    await row.first().waitFor({ timeout: 5000 });
    log((await row.count()) > 0, `probe 搵到嘅 ${dayMonth(PROBE_DATE)} 即刻加入西加航空清單`);
    await p.reload();
    await p
        .getByRole('button', { name: new RegExp(`^${label}`) })
        .first()
        .waitFor();
    const current = await currentEpisodeOf(p);
    log(new RegExp(`^${label}`).test(current), `重開節目頁揀 probe 搵到嘅最新一集：${current}`);
    await ctx.close();
};

const server = await startPreview();
let browser;
try {
    browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const context = await newE2EContext(browser, {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        colorScheme: 'dark',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // 先驗 probe 同 audio host：佢哋錯咗，下面最近一集嘅斷言會一連串錯（甚至 crash），睇唔到成因
    await checkProbeIgnoresUnknown(browser, errors);
    await checkProbeFindsNewEpisode(browser, errors);

    await page.goto(BASE);
    await page.waitForSelector('nav[aria-busy="false"]');
    await page.screenshot({ ...SHOT, path: `${OUT}/1-home.png` });
    const tiles = await page
        .locator('nav button')
        .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? e.textContent));
    // 每個節目一粒（src/config/shows.ts 次序）+ 最尾「今日節目」；刻意寫死做獨立對照
    log(
        tiles.map(tileName).join(' | ') === HOME_TILES.join(' | '),
        `主頁 ${HOME_TILES.length} 粒掣：${tiles.join(' | ')}`,
    );
    const cols = await page.evaluate(
        // 節目格喺分頁入面：nav > 捲動容器 > 每頁一個 grid
        () =>
            getComputedStyle(document.querySelector('nav > div > div')).gridTemplateColumns.split(
                ' ',
            ).length,
    );
    log(cols === 2, `主頁每行 ${cols} 粒`);
    await checkThemeColor(page, HOME_TOP, '主頁');
    await checkFixedHome(page, '390×844 主頁');
    await checkPoppinsLoaded(page, '390×844 主頁');

    const mini = page.getByRole('region', { name: '正在播放（今日節目）' });
    log(
        (await mini.textContent()).includes('在晴朗的一天出發'),
        `主頁 mini player 顯示今日第一個節目：${await mini.textContent()}`,
    );
    await page.getByRole('button', { name: '公子會', exact: true }).click();
    await page.getByRole('button', { name: '暫停', exact: true }).waitFor({ timeout: 5000 });
    log(page.url().endsWith('#/show/gongzi'), `轉到節目頁並自動播放：${page.url()}`);
    await checkShowHeader(page, '公子會', '公子會節目頁');
    const currentEpisode = () =>
        page.locator('button[aria-current="true"]').first().getAttribute('aria-label');
    const current = await currentEpisode();
    log(/^(?:播放|暫停) 17\/10/.test(current), `揀中最近一集（今日之前）：${current}`);
    const accent = await page.evaluate(() =>
        getComputedStyle(document.querySelector('[data-theme-scope]')).getPropertyValue(
            '--theme-accent',
        ),
    );
    log(accent.trim() === '#d4af5a', `節目頁用公子會色調：${accent}`);
    await checkThemeColor(page, GONGZI_BG, '公子會節目頁');
    await page.waitForTimeout(1500);
    await page.screenshot({ ...SHOT, path: `${OUT}/2-show-playing.png` });

    const slider = page.getByRole('slider', { name: '播放進度' });
    const box = await slider.boundingBox();
    const at = (vx, vy) => [box.x + (vx / 300) * box.width, box.y + (vy / 300) * box.height];
    await page.mouse.move(...at(150, 10));
    await page.mouse.down();
    await page.mouse.move(...at(60, 40), { steps: 5 });
    await page.mouse.move(...at(10, 150), { steps: 5 });
    await page.screenshot({ ...SHOT, path: `${OUT}/3-show-dragging.png` });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const afterDrag = Number(await slider.getAttribute('aria-valuenow'));
    log(
        Math.abs(afterDrag - 100) <= 3,
        `拖弧形 slider 去左邊 → ${afterDrag}s（預期約 100s / 600s）`,
    );

    await page.getByRole('button', { name: RESTART }).click();
    await page.waitForTimeout(300);
    const afterRestart = Number(await slider.getAttribute('aria-valuenow'));
    log(afterRestart <= 2, `由頭播放 → ${afterRestart}s（預期約 0s）`);

    await slider.focus();
    await page.keyboard.press('End');
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /^(?:播放|暫停) 10\/10/ }).click();
    await page.waitForTimeout(800);
    const row17 = await page
        .getByRole('button', { name: /^(?:播放|暫停) 17\/10/ })
        .getAttribute('aria-label');
    log(row17.endsWith('已收聽'), `聽到尾嘅 17/10 顯示已收聽：${row17}`);
    const sel = await currentEpisode();
    log(/^(?:播放|暫停) 10\/10/.test(sel), `撳集數轉集：${sel}`);
    const visible = await page.locator('button[aria-current="true"]').first().isVisible();
    log(visible, '揀中集數喺畫面內');
    await page.screenshot({ ...SHOT, path: `${OUT}/4-show-date-changed.png` });

    // 冇咗跳秒掣：用弧形 slider 嘅鍵盤 →（KEYBOARD_SEEK_SECONDS = 30 秒）
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await page.getByRole('button', { name: '暫停', exact: true }).click();
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
    // mini player 暫停緊 10/10：再入節目頁唔自動播、唔換集，停喺 10/10
    const kept = await currentEpisode();
    log(/^播放 10\/10/.test(kept), `再入節目頁：暫停緊嘅 10/10 唔會被蓋過 ${kept}`);
    await page.getByRole('button', { name: /^(?:播放|暫停) 17\/10/ }).click();
    await page.waitForTimeout(800);
    const resumed = await currentEpisode();
    log(/^(?:播放|暫停) 17\/10/.test(resumed), `撳返最近一集 ${resumed}（17/10 已聽過 → 由頭播）`);
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
    await page.getByRole('button', { name: /^(?:播放|暫停) 10\/10/ }).click();
    await page.waitForTimeout(800);
    const replayed = await page
        .getByRole('button', { name: /^(?:播放|暫停) 17\/10/ })
        .getAttribute('aria-label');
    log(/聽到 0:1\d$/.test(replayed), `重播超過 10 秒後清單顯示聽到：${replayed}`);
    const resumePos = Number(await slider.getAttribute('aria-valuenow'));
    log(resumePos >= 29, `未聽完嘅 10/10 續播：${resumePos}s`);

    await page.getByRole('button', { name: '返回主頁' }).click();
    await page.waitForTimeout(300);
    // T9 B：播緊舊集返主頁照播，mini player 將佢排最前、標「重溫」（以前係暫停）
    const oldEpisodeState = await waitForPlaybackState(page, 'playing');
    const rewatchMini = page.getByRole('region', { name: '正在播放（重溫及今日節目）' });
    const rewatchText = (await rewatchMini.textContent()) ?? '';
    log(
        oldEpisodeState === 'playing' &&
            /公子會重溫/.test(rewatchText) &&
            rewatchText.includes('10/10'),
        `播緊舊集返主頁繼續播，mini player 第一個係重溫：${oldEpisodeState} / ${rewatchText}`,
    );
    await page.getByRole('button', { name: '今日節目', exact: true }).click();
    // 播緊 10/10 入今日節目頁：唔自動播、唔蓋過，卡疊係未開始樣，撳播放先播今日第一個
    await page.getByRole('button', { name: '播放', exact: true }).waitFor({ timeout: 5000 });
    const keptPlaying = await page.evaluate(() => navigator.mediaSession.metadata?.title ?? '');
    log(keptPlaying.includes('公子會'), `入今日節目頁唔蓋過播緊嘅重溫：${keptPlaying}`);
    await page.getByRole('button', { name: '播放', exact: true }).click();
    await page.getByRole('button', { name: '暫停', exact: true }).waitFor({ timeout: 5000 });
    await page.waitForTimeout(1000);
    const items = await page
        .getByRole('region', { name: '節目表' })
        .locator('li button')
        .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    log(items.length === 3, `今日節目列表：${items.join(' | ')}`);
    const pageTitle = await page.getByRole('heading', { level: 1 }).textContent();
    log(pageTitle === '今日節目', `今日節目頁頁頭大字標題：${pageTitle}`);
    const heading = await todayCardTitle(page).textContent();
    log(heading === '在晴朗的一天出發', `今日撳播放播第一個節目：${heading}`);
    await checkThemeColor(page, SUNNYDAY_BG, '今日節目（在晴朗的一天出發）');
    await page.screenshot({ ...SHOT, path: `${OUT}/5-today.png` });
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
    const playingAfterSwipes = await waitForPlaybackState(page, 'playing');
    log(playingAfterSwipes === 'playing', `掃卡轉節目即刻播：${playingAfterSwipes}`);
    await page.getByRole('button', { name: /播放 雲妮鍾情/ }).click();
    await page.waitForTimeout(500);
    log((await todayCardTitle(page).textContent()) === '雲妮鍾情', '撳節目掣轉播');
    await page.screenshot({ ...SHOT, path: `${OUT}/6-today-switched.png` });

    await page.goBack();
    await page.waitForTimeout(500);
    const backState = await waitForPlaybackState(page, 'playing');
    const miniText = await page.getByRole('region', { name: '正在播放（今日節目）' }).textContent();
    log(
        page.url().endsWith('#/') && backState === 'playing' && miniText.includes('雲妮鍾情'),
        `播緊今日節目用返回手勢返主頁會繼續播，mini player 顯示：${backState} / ${miniText}`,
    );
    await checkVersionOnBanner(page, '390×844');
    await page.screenshot({ ...SHOT, path: `${OUT}/7-home-mini-player.png` });

    const narrow = await newE2EContext(browser, { viewport: { width: 320, height: 640 } });
    const np = await narrow.newPage();
    await np.goto(BASE);
    await np.waitForSelector('nav[aria-busy="false"]');
    await checkSplashRemoved(np);
    await checkVersionOnBanner(np, '320×640');
    await np.screenshot({ ...SHOT, path: `${OUT}/8-home-version-320.png` });
    for (const route of ['#/show/gongzi', '#/today']) {
        await np.goto(`${BASE}${route}`);
        // 由節目頁轉去今日節目頁時 player 已經載入咗節目，今日節目頁唔自動播（冇「由頭播放」），等唱片出就得
        await np.getByRole('slider', { name: '播放進度' }).waitFor();
        const overflow = await np.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        log(overflow === 0, `320px 闊冇橫向捲動（${route}，超出 ${overflow}px）`);
    }
    await narrow.close();

    // 主頁 mini player 循環掃：獨立 context，未載入任何節目
    const loop = await newE2EContext(browser, { viewport: { width: 390, height: 844 } });
    const lpp = await loop.newPage();
    lpp.on('pageerror', (e) => errors.push(e.message));
    await lpp.goto(BASE);
    await lpp.waitForSelector('nav[aria-busy="false"]');
    await checkMiniPlayerLoop(lpp);
    await loop.close();

    // 細 iPhone（320×568）：今日節目卡疊靜止嘅樣
    const small = await newE2EContext(browser, {
        viewport: { width: 320, height: 568 },
        deviceScaleFactor: 2,
        colorScheme: 'dark',
    });
    const sp = await small.newPage();
    sp.on('pageerror', (e) => errors.push(e.message));
    await sp.goto(`${BASE}#/today`);
    await sp.getByRole('button', { name: '暫停', exact: true }).waitFor({ timeout: 5000 });
    await sp.waitForTimeout(800);
    log((await horizontalOverflow(sp)) === 0, '320×568 今日節目冇橫向捲動');
    await sp.screenshot({ ...SHOT, path: `${OUT}/5c-today-320x568.png` });
    await dragTodayCard(sp, -TODAY_SWIPE_PX / 2);
    await checkTodayShow(sp, 'Bad Girl大過佬', BADGIRL_BG, '320×568 今日節目向左掃');
    log((await horizontalOverflow(sp)) === 0, '320×568 今日節目掃完冇橫向捲動');
    await small.close();

    // 主頁頁頂橫額：常見手機闊度（細 iPhone、一般、Pro Max）
    for (const { width, height, fixedHome } of HOME_BANNER_VIEWPORTS) {
        const ctx = await newE2EContext(browser, {
            viewport: { width, height },
            deviceScaleFactor: 2,
            colorScheme: 'dark',
        });
        const hp = await ctx.newPage();
        hp.on('pageerror', (e) => errors.push(e.message));
        await hp.goto(BASE);
        await hp.waitForSelector('nav[aria-busy="false"]');
        await hp.getByRole('region', { name: '正在播放（今日節目）' }).waitFor();
        await checkHomeBanner(hp, `${width}×${height} 主頁`, `home-banner-${width}x${height}.png`);
        if (fixedHome) await checkFixedHome(hp, `${width}×${height} 主頁`);
        await ctx.close();
    }

    // 節目頁 / 今日節目頁：任何高度都固定、只有清單自己捲。badgirl 集數多過一個畫面
    for (const { width, height, swipe, homeFixed, pagedHome, landscapeHome } of SHOW_VIEWPORTS) {
        const ctx = await newE2EContext(browser, {
            viewport: { width, height },
            deviceScaleFactor: 2,
        });
        const fp = await ctx.newPage();
        fp.on('pageerror', (e) => errors.push(e.message));
        await fp.goto(`${BASE}#/show/badgirl`);
        await fp.getByRole('button', { name: '暫停', exact: true }).waitFor({ timeout: 5000 });
        await fp.waitForTimeout(800);
        const label = `${width}×${height} 節目頁`;
        const shot = `show-${width}x${height}.png`;
        await checkShowHeader(fp, 'Bad Girl大過佬', label);
        await checkDayCellsFit(fp, label);
        if (swipe) {
            await checkSwipeToOlder(fp, width === 390 ? 'show-strip-dragging.png' : null);
            // 拖去舊一集之後正中仍然對齊
            await checkShowHeader(fp, 'Bad Girl大過佬', `${label}（拖完）`);
        }
        await checkFixedShowPage(fp, label, shot);
        await checkDiscMatchesToday(fp, label);
        // checkDiscMatchesToday 之後已經喺今日節目頁：同樣固定
        const todayLabel = `${width}×${height} 今日節目頁`;
        await fp.waitForTimeout(500);
        await checkFixedTodayPage(fp, todayLabel);
        await fp.screenshot({ ...SHOT, path: `${OUT}/today-${width}x${height}.png` });
        if (homeFixed) {
            await fp.goto(BASE);
            await fp.waitForSelector('nav[aria-busy="false"]');
            await fp.waitForTimeout(300);
            await checkFixedHome(fp, `${width}×${height} 主頁`);
            if (pagedHome) await checkPagedHome(fp, `${width}×${height} 主頁`);
            if (landscapeHome) await checkLandscapeHome(fp, `${width}×${height} 主頁（橫版）`);
            await fp.screenshot({ ...SHOT, path: `${OUT}/home-${width}x${height}.png` });
        }
        await ctx.close();
    }
    console.log('\n節目頁尺寸｜播放器佔高｜唱片｜清單行數');
    for (const m of metrics) console.log(`${m.label}｜${m.share}｜${m.disc}px｜${m.rows}`);
    console.log(
        `\n今日節目頁尺寸｜播放器（卡 → 指示點）佔高｜距 ${PLAYER_MAX_SHARE * 100}% 上限｜清單行數`,
    );
    for (const m of todayMetrics) console.log(`${m.label}｜${m.share}｜${m.headroom}｜${m.rows}`);
    console.log('');

    await checkShellMismatch(browser, errors);
    await checkMiniPlayerPosition(browser, errors);
    await checkMiniPlayerViewportGap(browser, errors);
    await checkNarrowLayout(browser, errors);

    // 真手指（CDP touch）：成頁唔捲、清單自己捲、卡 / 日子條 / mini player 掃得郁
    await runTouchChecks({ browser, base: BASE, out: OUT, errors, log });

    // 全集表向下拉閂：拉唔夠彈返、拉夠閂（觸控 header + 清單、滑鼠 header）
    sheetMissedTaps = await runArcSheetChecks({ browser, base: BASE, errors, log });
    await runHiddenPlaybackChecks({ browser, base: BASE, errors, log });

    // 主頁 mini player 重溫規則：平日重溫 + 今日節目、星期日冇節目
    await runMiniPlayerRuleChecks({ browser, base: BASE, errors, log });

    // 廣播劇：書架次序、短篇劇集頁第一次入嘅黑碟（同今日節目未上架一樣）、冇由頭播放
    await runDramaPageChecks({ browser, base: BASE, errors, log });

    const light = await newE2EContext(browser, {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        colorScheme: 'light',
    });
    const lp = await light.newPage();
    await lp.goto(BASE);
    await lp.waitForSelector('nav[aria-busy="false"]');
    await lp.screenshot({ ...SHOT, path: `${OUT}/7-home-light.png` });

    // 靜靜雞更新靠 registration.update()：build 出嚟嘅 sw.js 要註冊到同啟用
    const swScript = await lp.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        return registration.active?.scriptURL ?? '';
    });
    log(swScript.endsWith('/903-player/sw.js'), `Service worker 已啟用：${swScript}`);

    log(errors.length === 0, `冇 JS error ${errors.join('; ')}`);
    // e2e 唔靠外網：除咗刻意 mock 嘅 host，冇任何 request 出去（例如 Google Fonts）
    const external = [...new Set(externalRequests.map((url) => new URL(url).origin))];
    log(external.length === 0, `冇 request 出外網（mock 咗嘅 host 除外）：${external.join(', ')}`);
} finally {
    await browser?.close();
    server.kill();
}
if (sheetMissedTaps > 0) {
    console.log(
        `\nINFO  全集表第一下撳被食咗 ${sheetMissedTaps} 次，補撳先開到（CUI-0010）：次次都有就要查 app`,
    );
}
console.log(failures === 0 ? '\nAll E2E checks passed' : `\n${failures} E2E check(s) failed`);
process.exitCode = failures === 0 ? 0 : 1;
