// HomeView 節目頁 e2e（P10 lane 6，_mockups_/home-view 節目頁 S3 / S5）：544×544 方形螢幕，
// 播放器為主（唱片 256px 置中、頁頭下面 16px、日子條貼近底邊），集數清單收入頁頭清單掣（badge = 集數）
// 開嘅 sheet：由底升起、icon 變實色；再撳掣、✕、Escape、向下拉都閂到，閂咗焦點返清單掣；減少動態即刻切換。
// 現有裝置唔受影響由 `npm run e2e:visual` 驗；呢度只留一個現有手機做對照。每個情境用獨立 context
import { buildCatalogDocument } from '../scripts/buildCatalogJson.mjs';
import { ROW_OPEN, openSavedTab, seedBookmark } from './bookmark.mjs';
import { PHONE, ensurePlaying, isShown, newE2EPage, runSection } from './harness.mjs';
import { CATALOG_DIR, CATALOG_FOLDER, openWithCatalog } from './remoteCatalog.mjs';
import { SAMPLE_RECORDINGS } from './sampleData.mjs';

/** HomeView 假設尺寸；刻意寫死做獨立對照，唔 import src 常數 */
const SQUARE = { width: 544, height: 544 };
const SHOW_ROUTE = '#/show/gongzi';
const EPISODES = SAMPLE_RECORDINGS.filter((r) => r.showId === 'gongzi').length;
const LIST_BUTTON = `集數清單，共 ${EPISODES} 集`;
// mockup：唱片 256px、頁頭下面 16px；sheet 由畫面 38% 開始（--list-sheet-height 62%）
const DISC_PX = 256;
const HEADER_GAP_PX = 16;
const SHEET_TOP_SHARE = 0.38;
// 日子條底離畫面底最多幾遠（mockup 36px；app 8px 底 padding）
const STRIP_BOTTOM_MAX_GAP_PX = 36;
const TOLERANCE_PX = 1.5;
const SHEET_TOLERANCE_PX = 3;
// 開 / 閂動畫（--view-transition-fade）完成都夠
const SHEET_WAIT_MS = 3000;
// 向下拉閂：拉過表高一半以上
const DRAG_PX = 260;
const DRAG_STEPS = 12;

const near = (value, expected, tolerance = TOLERANCE_PX) => Math.abs(value - expected) <= tolerance;

const openShow = async (env, contextOptions = {}) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, {
        viewport: SQUARE,
        ...contextOptions,
    });
    await p.goto(`${env.base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    return { ctx, p };
};

const listButton = (p) => p.getByRole('button', { name: LIST_BUTTON });
const sheet = (p) => p.getByRole('dialog', { name: '集數' });

/** 唱片、頁頭、日子條、清單掣同 badge 嘅位置；有冇嘢出咗畫面 */
const look = (p) =>
    p.evaluate((label) => {
        const box = (el) => {
            const r = el?.getBoundingClientRect();
            return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
        };
        const gauge = document.querySelector('[data-player-gauge]');
        const disc = gauge?.querySelector('[class*="large"]');
        const header = document.querySelector('main header');
        const button = document.querySelector(`button[aria-label="${label}"]`);
        const strip = document.querySelector('[aria-roledescription="轉集"]');
        const outside = [...document.querySelectorAll('main button, main [role="slider"]')]
            .map((el) => el.getBoundingClientRect())
            .filter((r) => r.width > 0)
            .filter(
                (r) =>
                    r.left < -0.5 ||
                    r.top < -0.5 ||
                    r.right > innerWidth + 0.5 ||
                    r.bottom > innerHeight + 0.5,
            ).length;
        return {
            vw: innerWidth,
            vh: innerHeight,
            scrollW: document.documentElement.scrollWidth,
            scrollH: document.documentElement.scrollHeight,
            disc: box(disc),
            gauge: box(gauge),
            header: box(header),
            button: box(button),
            buttonLast: [...(header?.querySelectorAll('button') ?? [])].at(-1) === button,
            badge: button?.querySelector('[aria-hidden="true"]:not(svg)')?.textContent ?? null,
            strip: box(strip),
            pageList: document.querySelector('main section h2') !== null,
            outside,
        };
    }, LIST_BUTTON);

/** 播放器為主：唱片 256px 置中、頁頭下面 16px，日子條貼近底邊，清單掣喺頁頭最右、badge = 集數 */
const checkLayout = async (env) => {
    const { ctx, p } = await openShow(env);
    const l = await look(p);
    const discCentre = l.disc ? l.disc.x + l.disc.w / 2 : 0;
    env.log(
        l.disc !== null && near(l.disc.w, DISC_PX) && near(discCentre, l.vw / 2),
        `HomeView 節目頁：唱片 ${DISC_PX}px 左右置中（${JSON.stringify(l.disc)}）`,
    );
    const headerBottom = l.header ? l.header.y + l.header.h : 0;
    env.log(
        l.gauge !== null && near(l.gauge.y - headerBottom, HEADER_GAP_PX),
        `HomeView 節目頁：唱片格離頁頭 ${HEADER_GAP_PX}px（頁頭底 ${headerBottom}、唱片格頂 ${l.gauge?.y}）`,
    );
    const stripBottom = l.strip ? l.strip.y + l.strip.h : Infinity;
    env.log(
        stripBottom <= l.vh && l.vh - stripBottom <= STRIP_BOTTOM_MAX_GAP_PX,
        `HomeView 節目頁：日子條貼近底邊（底 ${stripBottom} / ${l.vh}）`,
    );
    env.log(
        l.button !== null && l.buttonLast && l.badge === String(EPISODES) && !l.pageList,
        `HomeView 節目頁：頁頭最右清單掣 badge ${l.badge}（預期 ${EPISODES}），頁面冇集數清單`,
    );
    env.log(
        l.scrollW <= l.vw && l.scrollH <= l.vh && l.outside === 0,
        `HomeView 節目頁：全部喺畫面入面（捲動 ${l.scrollW}×${l.scrollH}，出界掣 ${l.outside}）`,
    );
    await ctx.close();
};

/** sheet 開咗：dialog、icon 實色（aria-expanded）、焦點入表、由畫面 38% 開始貼底、行數 = 集數 */
const checkOpened = async (env, p, how) => {
    const shown = await isShown(sheet(p), { timeout: SHEET_WAIT_MS });
    // 等升起動畫完先量位置
    await p.waitForFunction(
        () =>
            [...document.querySelectorAll('[role="dialog"]')].every(
                (el) => el.getAnimations().length === 0,
            ),
        undefined,
        { timeout: SHEET_WAIT_MS },
    );
    const state = await p.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const r = dialog?.getBoundingClientRect();
        return {
            top: r?.top ?? null,
            bottom: r?.bottom ?? null,
            focused: dialog?.contains(document.activeElement) ?? false,
            rows: dialog?.querySelectorAll('li[data-episode-key]').length ?? 0,
            filled: getComputedStyle(
                document.querySelector('button[aria-expanded="true"]') ?? document.body,
            ).backgroundColor,
        };
    });
    const expanded = await listButton(p).getAttribute('aria-expanded');
    env.log(
        shown &&
            expanded === 'true' &&
            state.focused &&
            state.rows === EPISODES &&
            state.filled !== 'rgba(0, 0, 0, 0)' &&
            near(state.top, SQUARE.height * SHEET_TOP_SHARE, SHEET_TOLERANCE_PX) &&
            near(state.bottom, SQUARE.height, SHEET_TOLERANCE_PX),
        `HomeView 清單 sheet（${how}）：升起、icon 實色、焦點入表、${state.rows} 行（${JSON.stringify(state)}）`,
    );
};

/** sheet 閂咗：dialog 冇咗、icon 返原樣、焦點返清單掣 */
const checkClosed = async (env, p, how) => {
    const gone = await isShown(sheet(p), { state: 'detached', timeout: SHEET_WAIT_MS });
    const expanded = await listButton(p).getAttribute('aria-expanded');
    const focused = await p.evaluate(
        (label) => document.activeElement?.getAttribute('aria-label') === label,
        LIST_BUTTON,
    );
    env.log(
        gone && expanded === 'false' && focused,
        `HomeView 清單 sheet 由${how}閂：表冇咗、icon 返原樣、焦點返清單掣（expanded ${expanded}、focus ${focused}）`,
    );
};

/** 拉 grab bar 向下 */
const dragDown = async (p) => {
    const grab = await sheet(p).locator('span[aria-hidden="true"]').first().boundingBox();
    const x = grab.x + grab.width / 2;
    const y = grab.y + grab.height / 2;
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.mouse.move(x, y + DRAG_PX, { steps: DRAG_STEPS });
    await p.mouse.up();
};

const CLOSERS = [
    ['✕', (p) => sheet(p).getByRole('button', { name: '關閉清單' }).click()],
    ['Escape', (p) => p.keyboard.press('Escape')],
    [
        // 開咗之後遮罩蓋住頁頭：喺清單掣個位再撳一下（觸控用家撳返同一粒掣）
        '再撳清單掣',
        async (p) => {
            const b = await listButton(p).boundingBox();
            await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
        },
    ],
    ['向下拉', dragDown],
];

/** 撳清單掣開，再用四種方法逐個閂 */
const checkSheet = async (env) => {
    const { ctx, p } = await openShow(env);
    for (const [how, close] of CLOSERS) {
        await listButton(p).click();
        await checkOpened(env, p, how);
        await close(p);
        await checkClosed(env, p, how);
    }
    await ctx.close();
};

/** W-795：由「我的收藏」入頁 sheet 自動開（冇撳過清單掣），Escape 閂咗焦點都返清單掣，唔係 <body> */
const checkAutoOpenedFocus = async (env) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport: SQUARE });
    await seedBookmark(ctx);
    await openSavedTab(p, env.base);
    await p.getByRole('button', { name: ROW_OPEN }).click();
    const opened = await isShown(sheet(p), { timeout: SHEET_WAIT_MS });
    env.log(opened, 'HomeView 由我的收藏入節目頁：清單 sheet 自動開');
    await p.keyboard.press('Escape');
    await checkClosed(env, p, '收藏自動開後 Escape ');
    await ctx.close();
};

/** 減少動態：開 / 閂都冇動畫，即刻切換 */
const checkReducedMotion = async (env) => {
    const { ctx, p } = await openShow(env, { reducedMotion: 'reduce' });
    await listButton(p).click();
    const opened = await p.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog !== null && dialog.getAnimations().length === 0;
    });
    await sheet(p).getByRole('button', { name: '關閉清單' }).click();
    const closedAtOnce = await p.evaluate(() => document.querySelector('[role="dialog"]') === null);
    env.log(
        opened && closedAtOnce,
        `HomeView 清單 sheet 減少動態：開冇動畫（${opened}）、閂即刻冇咗（${closedAtOnce}）`,
    );
    await ctx.close();
};

/** 內建 catalog + 公子會簡介（有資料先有 ⓘ） */
const infoCatalog = (base) => {
    const imageBase = new URL(CATALOG_FOLDER, base).pathname;
    const doc = buildCatalogDocument({ catalogDir: CATALOG_DIR.pathname, imageBase });
    const shows = doc.shows.map((s) =>
        s.id === 'gongzi' ? { ...s, definition: { ...s.definition, summary: '示範簡介' } } : s,
    );
    return JSON.stringify({ ...doc, shows });
};

/** 有節目資料：ⓘ 喺頁頭最右、清單掣喺佢左邊（S5），唱片圈唔再出 ⓘ */
const checkInfoInHeader = async (env) => {
    const { ctx, p } = await openWithCatalog(env, {
        catalogBody: infoCatalog(env.base),
        contextOptions: { viewport: SQUARE },
    });
    await p.goto(`${env.base}${SHOW_ROUTE}`);
    // 第一次入有資料會自動彈資料 sheet：閂咗先睇頁頭
    const auto = p.getByRole('dialog', { name: '節目資料' });
    if (await isShown(auto, { timeout: SHEET_WAIT_MS })) await p.keyboard.press('Escape');
    await isShown(auto, { state: 'detached', timeout: SHEET_WAIT_MS });
    const order = await p.evaluate(() =>
        [...document.querySelectorAll('main header button')].map((b) => ({
            label: b.getAttribute('aria-label'),
            right: b.getBoundingClientRect().right,
        })),
    );
    const infoButtons = await p.getByRole('button', { name: '節目資料' }).count();
    const labels = order.map((b) => b.label);
    const info = order.at(-1);
    env.log(
        labels.at(-2) === LIST_BUTTON &&
            info?.label === '節目資料' &&
            info.right <= SQUARE.width &&
            infoButtons === 1,
        `HomeView 節目頁：頁頭 ${labels.join(' / ')}，ⓘ 最右（${info?.right}）、成頁得一粒 ⓘ（${infoButtons}）`,
    );
    await p.getByRole('button', { name: '節目資料' }).click();
    env.log(
        await isShown(auto, { timeout: SHEET_WAIT_MS }),
        'HomeView 節目頁：撳頁頭 ⓘ 開節目資料',
    );
    await ctx.close();
};

/** 對照：現有手機節目頁照舊（清單喺頁面、冇清單掣） */
const checkPhoneUnchanged = async (env) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport: PHONE });
    await p.goto(`${env.base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    const pageList = await p.getByRole('heading', { name: '集數' }).isVisible();
    const button = await listButton(p).count();
    env.log(
        pageList && button === 0,
        `現有手機節目頁照舊：集數清單喺頁面（${pageList}）、冇清單掣（${button}）`,
    );
    await ctx.close();
};

const SCENARIOS = [
    ['HomeView 節目頁版面', checkLayout],
    ['HomeView 清單 sheet 開閂', checkSheet],
    ['HomeView 清單 sheet 收藏自動開', checkAutoOpenedFocus],
    ['HomeView 清單 sheet 減少動態', checkReducedMotion],
    ['HomeView 頁頭 ⓘ', checkInfoInHeader],
    ['HomeView 現有手機對照', checkPhoneUnchanged],
];

export const runSquareChecks = async (env) => {
    for (const [name, check] of SCENARIOS) {
        await runSection(env.log, name, () => check(env), env.browser);
    }
};
