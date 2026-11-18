// HomeView 廣播劇頁 e2e（P10 lane 7b，_mockups_/home-view 廣播劇頁 / S8）：544×544，跟住用戶喺邊一層——
// 未揀短篇：頁面「全集」、黑碟，頁頭清單掣 badge = 短篇數、開全集表；播緊短篇：頁面短篇名 + 集名，
// badge = 嗰個短篇集數、開短篇表（頂 banner 同全集表一樣，右上「全集」掣換返全集表）。
// 第一次入自動開全集表（同其他裝置）：鍵盤閂焦點返清單掣，滑鼠閂唔搬、冇 ring。
// 每日劇集頁冇 mockup：跟節目頁（lane 6）做，播放器為主、集數清單收入清單 sheet。
// 由 square.mjs 嘅 SCENARIOS 跑（同一個 section 入口）
import { buildCatalogDocument } from '../scripts/buildCatalogJson.mjs';
import { checkNoPointerRing, focusedName, scrimPoint } from './focusTrap.mjs';
import {
    DRAMA_AUDIO_BASE,
    PHONE,
    isShown,
    newE2EPage,
    serveWav,
    waitForPlaybackState,
} from './harness.mjs';
import { CATALOG_DIR, CATALOG_FOLDER, openWithCatalog } from './remoteCatalog.mjs';

/** HomeView 假設尺寸；刻意寫死做獨立對照，唔 import src 常數 */
const SQUARE = { width: 544, height: 544 };
const SERIES_ROUTE = '#/drama/chisee';
const DAILY_ROUTE = '#/drama/c18';
// 芝See 第一個短篇同佢嘅集數（src/catalog/dramas/library/chisee/drama.json，刻意寫死做獨立對照）
const ARC = '三十六計';
const ARC_EPISODES = 36;
const ARC_BUTTON = `${ARC}集數清單，共 ${ARC_EPISODES} 集`;
const ALL_BUTTON = /^全集，共 \d+ 個短篇$/;
const DAILY_BUTTON = /^集數清單，共 \d+ 集$/;
// mockup：唱片 256px、頁頭下面 16px；sheet 由畫面 38% 開始
const DISC_PX = 256;
const HEADER_GAP_PX = 16;
const SHEET_TOP_SHARE = 0.38;
const TOLERANCE_PX = 1.5;
const SHEET_TOLERANCE_PX = 3;
// mockup 短篇表 banner 約 110px 高（544 闊）
const BANNER_PX = 110;
const BANNER_TOLERANCE_PX = 4;
// 開 / 閂動畫完成都夠
const SHEET_WAIT_MS = 3000;

const near = (value, expected, tolerance = TOLERANCE_PX) =>
    value !== null && value !== undefined && Math.abs(value - expected) <= tolerance;

const allSheet = (p) => p.getByRole('dialog', { name: '全集' });
const arcSheet = (p) => p.getByRole('dialog', { name: '集數' });
const allButton = (p) => p.getByRole('button', { name: ALL_BUTTON });
const arcButton = (p) => p.getByRole('button', { name: ARC_BUTTON });

/** 第一次入（新 context 冇進度）：全集表一入嚟就自動開 */
const openSeries = async (env, contextOptions = {}) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, {
        viewport: SQUARE,
        ...contextOptions,
    });
    await ctx.route(`${DRAMA_AUDIO_BASE}/**`, (route) => serveWav(route));
    await p.goto(`${env.base}${SERIES_ROUTE}`);
    return { ctx, p };
};

/** 等張表升 / 落完先量 */
const settle = (p) =>
    p.waitForFunction(
        () =>
            [...document.querySelectorAll('[role="dialog"]')].every(
                (el) => el.getAnimations().length === 0,
            ),
        undefined,
        { timeout: SHEET_WAIT_MS },
    );

/** 唱片、頁頭、清單掣 badge、唱片下面嗰組字、頁面有冇短篇 chips / 集數清單、有冇嘢出界 */
const look = (p) =>
    p.evaluate(() => {
        const box = (el) => {
            const r = el?.getBoundingClientRect();
            return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
        };
        const gauge = document.querySelector('[data-player-gauge]');
        const header = document.querySelector('main header');
        const button = header?.querySelector('button[aria-haspopup="dialog"]');
        // 日子條自己左右捲（剪走嘅日子唔算出界）
        const outside = [...document.querySelectorAll('main button, main [role="slider"]')]
            .filter((el) => !el.closest('[aria-roledescription="轉集"]'))
            .map((el) => el.getBoundingClientRect())
            .filter((r) => r.width > 0)
            .filter(
                (r) =>
                    r.left < -0.5 ||
                    r.top < -0.5 ||
                    r.right > innerWidth + 0.5 ||
                    r.bottom > innerHeight + 0.5,
            ).length;
        const title = document.querySelector('[data-series-title]');
        return {
            vw: innerWidth,
            vh: innerHeight,
            scrollW: document.documentElement.scrollWidth,
            scrollH: document.documentElement.scrollHeight,
            disc: box(gauge?.querySelector('[class*="large"]')),
            gauge: box(gauge),
            header: box(header),
            badge: button?.querySelector('[aria-hidden="true"]:not(svg)')?.textContent ?? null,
            buttonLast: [...(header?.querySelectorAll('button') ?? [])].at(-1) === button,
            title: title?.textContent ?? null,
            titleBottom: title ? title.getBoundingClientRect().bottom : null,
            chips: document.querySelector('main [role="group"][aria-label="短篇"]') !== null,
            pageList:
                document.querySelector('main ul[data-sheet-scroll], main section h2') !== null,
            strip: box(document.querySelector('[aria-roledescription="轉集"]')),
            outside,
        };
    });

/** 播放器為主：唱片 256px 置中、頁頭下面 16px，全部喺畫面入面、冇橫 / 直捲動 */
const logPlayerLayout = (env, l, label) => {
    const discCentre = l.disc ? l.disc.x + l.disc.w / 2 : 0;
    const headerBottom = l.header ? l.header.y + l.header.h : 0;
    env.log(
        l.disc !== null &&
            near(l.disc.w, DISC_PX) &&
            near(discCentre, l.vw / 2) &&
            near(l.gauge?.y - headerBottom, HEADER_GAP_PX),
        `${label}：唱片 ${DISC_PX}px 置中、離頁頭 ${HEADER_GAP_PX}px（${JSON.stringify(l.disc)}、頁頭底 ${headerBottom}、唱片格頂 ${l.gauge?.y}）`,
    );
    env.log(
        l.scrollW <= l.vw && l.scrollH <= l.vh && l.outside === 0,
        `${label}：全部喺畫面入面（捲動 ${l.scrollW}×${l.scrollH}，出界掣 ${l.outside}）`,
    );
};

/** 全集表「聽完 0 / N 個」嘅 N（= 短篇數） */
const arcCountOf = async (p) => {
    const text = (await allSheet(p).textContent()) ?? '';
    return Number(/聽完 \d+ \/ (\d+) 個/.exec(text)?.[1] ?? NaN);
};

/**
 * 第一次入：自動開全集表、清單掣開住（badge = 短篇數）；Escape 閂焦點返清單掣。
 * 頁面：「全集」+「揀一個短篇開始收聽」、冇短篇 chips / 集數清單，唱片 256 置中
 */
const checkSeriesNoArc = async (env) => {
    const { ctx, p } = await openSeries(env, { reducedMotion: 'reduce' });
    const popped = await isShown(allSheet(p), { timeout: SHEET_WAIT_MS });
    const arcs = popped ? await arcCountOf(p) : NaN;
    const expanded = await allButton(p).getAttribute('aria-expanded');
    await p.keyboard.press('Escape');
    const gone = await isShown(allSheet(p), { state: 'detached', timeout: SHEET_WAIT_MS });
    const focused = await focusedName(p);
    env.log(
        popped && expanded === 'true' && gone && focused === `BUTTON 全集，共 ${arcs} 個短篇`,
        `HomeView 廣播劇頁第一次入：自動開全集表（清單掣 expanded ${expanded}），Escape 閂焦點返清單掣（${focused}）`,
    );
    const l = await look(p);
    env.log(
        l.badge === String(arcs) &&
            l.buttonLast &&
            l.title?.startsWith('全集') === true &&
            l.title.includes('揀一個短篇開始收聽') &&
            !l.chips &&
            !l.pageList &&
            l.titleBottom <= l.vh,
        `HomeView 廣播劇頁未揀短篇：badge ${l.badge}（短篇數 ${arcs}）、頁面「${l.title}」、冇 chips（${l.chips}）/ 清單（${l.pageList}）`,
    );
    logPlayerLayout(env, l, 'HomeView 廣播劇頁未揀短篇');
    await allButton(p).click();
    env.log(
        await isShown(allSheet(p), { timeout: SHEET_WAIT_MS }),
        'HomeView 廣播劇頁未揀短篇：撳清單掣開全集表',
    );
    await ctx.close();
};

/** C-025：第一次入自動開嘅全集表用滑鼠撳遮罩閂，清單掣唔搬焦點、冇 focus ring */
const checkSeriesFirstVisitPointerClose = async (env) => {
    const { ctx, p } = await openSeries(env);
    const opened = await isShown(allSheet(p), { timeout: SHEET_WAIT_MS });
    const point = opened
        ? await scrimPoint(p, p.getByTestId('arc-sheet-backdrop'), allSheet(p))
        : { onScrim: false };
    if (point.onScrim) await p.mouse.click(point.x, point.y);
    const closed = await isShown(allSheet(p), { state: 'detached', timeout: SHEET_WAIT_MS });
    env.log(
        opened && point.onScrim && closed,
        `HomeView 廣播劇頁第一次入自動開全集表滑鼠撳遮罩閂咗（自動開 ${opened}、撳中遮罩 ${point.onScrim}、閂咗 ${closed}）`,
    );
    await checkNoPointerRing(allButton(p), env.log, 'HomeView 廣播劇頁自動開全集表滑鼠撳遮罩');
    await ctx.close();
};

/** 短篇表：banner（短篇名、約 110px 高）、行數 = 集數、由畫面 38% 開始貼底、有「全集」掣 */
const lookArcSheet = (p) =>
    arcSheet(p).evaluate((dialog) => {
        const r = dialog.getBoundingClientRect();
        const banner = dialog.querySelector('[data-testid="info-banner"]');
        return {
            top: r.top,
            bottom: r.bottom,
            bannerTitle: banner?.querySelector('h2')?.textContent ?? null,
            bannerH: banner?.getBoundingClientRect().height ?? null,
            rows: dialog.querySelectorAll('li[data-episode-key]').length,
            all: [...dialog.querySelectorAll('button')].some((b) => b.textContent === '全集'),
        };
    });

/**
 * 揀短篇 + 播：頁面「現正播放」+ 短篇名 + 集名，badge = 嗰個短篇集數；清單掣開短篇表；
 * 「全集」掣換返全集表（短篇表冇咗、清單掣仍然開住），再 Escape 閂焦點返清單掣
 */
const checkSeriesArc = async (env) => {
    const { ctx, p } = await openSeries(env, { reducedMotion: 'reduce' });
    await isShown(allSheet(p), { timeout: SHEET_WAIT_MS });
    await allSheet(p)
        .getByRole('button', { name: new RegExp(`^${ARC}，`) })
        .click();
    await isShown(allSheet(p), { state: 'detached', timeout: SHEET_WAIT_MS });
    await p.getByRole('button', { name: '播放', exact: true }).click();
    await waitForPlaybackState(p, 'playing');
    const l = await look(p);
    env.log(
        l.badge === String(ARC_EPISODES) &&
            l.title?.startsWith('現正播放') === true &&
            l.title.includes(ARC) &&
            l.title.includes('第 1 集') &&
            (await arcButton(p).count()) === 1,
        `HomeView 廣播劇頁播緊短篇：badge ${l.badge}（${ARC_EPISODES}）、頁面「${l.title}」`,
    );
    logPlayerLayout(env, l, 'HomeView 廣播劇頁播緊短篇');
    await arcButton(p).click();
    await isShown(arcSheet(p), { timeout: SHEET_WAIT_MS });
    await settle(p);
    const s = await lookArcSheet(p);
    env.log(
        s.bannerTitle === ARC &&
            near(s.bannerH, BANNER_PX, BANNER_TOLERANCE_PX) &&
            s.rows === ARC_EPISODES &&
            s.all &&
            near(s.top, SQUARE.height * SHEET_TOP_SHARE, SHEET_TOLERANCE_PX) &&
            near(s.bottom, SQUARE.height, SHEET_TOLERANCE_PX),
        `HomeView 短篇表：banner「${s.bannerTitle}」${s.bannerH}px、${s.rows} 集、有全集掣、由 38% 開始（${JSON.stringify(s)}）`,
    );
    await arcSheet(p).getByRole('button', { name: '全集', exact: true }).click();
    const switched = await isShown(allSheet(p), { timeout: SHEET_WAIT_MS });
    const arcGone = await isShown(arcSheet(p), { state: 'detached', timeout: SHEET_WAIT_MS });
    const expanded = await arcButton(p).getAttribute('aria-expanded');
    await settle(p);
    const allTop = await allSheet(p).evaluate((el) => el.getBoundingClientRect().top);
    env.log(
        switched &&
            arcGone &&
            expanded === 'true' &&
            near(allTop, SQUARE.height * SHEET_TOP_SHARE, SHEET_TOLERANCE_PX),
        `HomeView 短篇表「全集」掣換去全集表（全集表 ${switched}、短篇表冇咗 ${arcGone}、清單掣 expanded ${expanded}、全集表頂 ${allTop}）`,
    );
    await p.keyboard.press('Escape');
    await isShown(allSheet(p), { state: 'detached', timeout: SHEET_WAIT_MS });
    const focused = await focusedName(p);
    env.log(
        focused === `BUTTON ${ARC_BUTTON}`,
        `HomeView 由短篇表轉去嘅全集表 Escape 閂：焦點返清單掣（${focused}）`,
    );
    await ctx.close();
};

/** 每日劇集（c18）內建資料停用：用 runtime catalog 開返（同 duo.mjs / visualScenes.mjs 一樣） */
const dailyCatalog = (base) => {
    const doc = buildCatalogDocument({
        catalogDir: CATALOG_DIR.pathname,
        imageBase: new URL(CATALOG_FOLDER, base).pathname,
    });
    const dramas = doc.dramas.map((drama) =>
        drama.id === 'c18'
            ? { ...drama, definition: { ...drama.definition, enabled: true } }
            : drama,
    );
    return JSON.stringify({ ...doc, dramas });
};

/**
 * 每日劇集頁：同節目頁一樣播放器為主（唱片 256 置中、日子條喺畫面入面），頁頭清單掣喺最右、
 * badge = 集數；撳開集數 sheet（行數 = badge），頁面冇集數清單
 */
const checkDaily = async (env) => {
    const { ctx, p } = await openWithCatalog(env, {
        catalogBody: dailyCatalog(env.base),
        contextOptions: { viewport: SQUARE, reducedMotion: 'reduce' },
    });
    await p.goto(`${env.base}${DAILY_ROUTE}`);
    const button = p.getByRole('button', { name: DAILY_BUTTON });
    await isShown(button, { timeout: SHEET_WAIT_MS });
    const l = await look(p);
    const label = (await button.getAttribute('aria-label')) ?? '';
    const count = /共 (\d+) 集/.exec(label)?.[1];
    env.log(
        l.badge === count &&
            l.buttonLast &&
            !l.pageList &&
            l.strip !== null &&
            l.strip.y + l.strip.h <= l.vh,
        `HomeView 每日劇集頁：頁頭最右清單掣 badge ${l.badge}（${label}）、頁面冇清單、日子條喺畫面入面`,
    );
    logPlayerLayout(env, l, 'HomeView 每日劇集頁');
    await button.click();
    const opened = await isShown(arcSheet(p), { timeout: SHEET_WAIT_MS });
    const rows = await arcSheet(p).evaluate(
        (el) => el.querySelectorAll('li[data-episode-key]').length,
    );
    env.log(
        opened && rows >= Number(count),
        `HomeView 每日劇集頁：清單掣開集數 sheet（${rows} 行，badge ${count}）`,
    );
    await ctx.close();
};

/** 對照：現有手機短篇劇集頁照舊（短篇 chips + 集數清單喺頁面、冇清單掣） */
const checkPhoneSeriesUnchanged = async (env) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, {
        viewport: PHONE,
        reducedMotion: 'reduce',
    });
    await p.goto(`${env.base}${SERIES_ROUTE}`);
    if (await isShown(allSheet(p), { timeout: SHEET_WAIT_MS })) await p.keyboard.press('Escape');
    const pageList = await p.getByRole('heading', { name: '集數' }).isVisible();
    const button = await allButton(p).count();
    env.log(
        pageList && button === 0,
        `現有手機短篇劇集頁照舊：集數清單喺頁面（${pageList}）、冇清單掣（${button}）`,
    );
    await ctx.close();
};

export const SQUARE_DRAMA_SCENARIOS = [
    ['HomeView 廣播劇頁未揀短篇', checkSeriesNoArc],
    ['HomeView 廣播劇頁第一次入滑鼠閂', checkSeriesFirstVisitPointerClose],
    ['HomeView 廣播劇頁播緊短篇', checkSeriesArc],
    ['HomeView 每日劇集頁', checkDaily],
    ['HomeView 現有手機廣播劇頁對照', checkPhoneSeriesUnchanged],
];
