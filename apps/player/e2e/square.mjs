// HomeView 節目頁 e2e（P10 lane 6，_mockups_/home-view 節目頁 S3 / S5）：544×544 方形螢幕，
// 播放器為主（唱片 256px 置中、頁頭下面 16px、日子條貼近底邊），集數清單收入頁頭清單掣（badge = 集數）
// 開嘅 sheet：由底升起、icon 變實色；再撳掣、✕、Escape、向下拉都閂到，閂咗焦點返清單掣；減少動態即刻切換。
// 今日節目頁（P10 lane 7a，S6）：同一個普通播放器（冇卡疊 / 指示點），「現正播放」下面節目 selector
// （揀中有外框、未上架灰色停用、多過 4 個左右捲，仲有格嗰邊淡出），頁頭清單掣 badge = 今日節目數、ⓘ 跟住而家個節目；
// 第一次入（未睇過今日節目資料）自動開節目表 sheet、每行展開資料，之後唔再開（用戶 2026-11-18）。
// 現有裝置唔受影響由 `npm run e2e:visual` 驗；呢度只留一個現有手機做對照。每個情境用獨立 context
import { buildCatalogDocument } from '../scripts/buildCatalogJson.mjs';
import { ROW_OPEN, openSavedTab, seedBookmark } from './bookmark.mjs';
import { checkNoPointerRing, checkTabWrap, focusedName, scrimPoint } from './focusTrap.mjs';
import { PHONE, ensurePlaying, isShown, newE2EPage, runSection, succeeds } from './harness.mjs';
import { CATALOG_DIR, CATALOG_FOLDER, openWithCatalog } from './remoteCatalog.mjs';
import { SAMPLE_RECORDINGS } from './sampleData.mjs';

/** HomeView 假設尺寸；刻意寫死做獨立對照，唔 import src 常數 */
const SQUARE = { width: 544, height: 544 };
const SHOW_ROUTE = '#/show/gongzi';
const TODAY_ROUTE = '#/today';
// E2E_NOW（2026-11-30）嘅今日：有錄音（播得）嘅節目數
const TODAY_DATE = '2026-11-30';
const TODAY_PLAYABLE = SAMPLE_RECORDINGS.filter((r) => r.date === TODAY_DATE).length;
// mockup：一次見到 4 格，多過就捲
const SELECTOR_VISIBLE = 4;
const SELECTOR = '[data-show-selector]';
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

/**
 * C-025：由「我的收藏」入頁自動開嘅清單 sheet 用滑鼠撳遮罩閂，清單掣唔可以被搬焦點、
 * 唔可以出 focus ring（用戶只接受鍵盤閂見到 ring；有 opener 嘅開閂見 checkSheet）
 */
const checkAutoOpenedPointerClose = async (env) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport: SQUARE });
    await seedBookmark(ctx);
    await openSavedTab(p, env.base);
    await p.getByRole('button', { name: ROW_OPEN }).click();
    const opened = await isShown(sheet(p), { timeout: SHEET_WAIT_MS });
    const point = opened
        ? await scrimPoint(p, p.getByTestId('list-sheet-backdrop'), sheet(p))
        : { onScrim: false };
    if (point.onScrim) await p.mouse.click(point.x, point.y);
    const closed = await isShown(sheet(p), { state: 'detached', timeout: SHEET_WAIT_MS });
    env.log(
        opened && point.onScrim && closed,
        `HomeView 收藏自動開清單 sheet 滑鼠撳遮罩閂咗（自動開 ${opened}、撳中遮罩 ${point.onScrim}、閂咗 ${closed}）`,
    );
    await checkNoPointerRing(listButton(p), env.log, 'HomeView 收藏自動開清單 sheet 滑鼠撳遮罩');
    await ctx.close();
};

/** P10 lane 6c：鍵盤 Tab 喺清單 sheet（aria-modal）入面循環，唔會行去背後嘅頁頭 / 播放器掣 */
const checkTabTrap = async (env) => {
    const { ctx, p } = await openShow(env, { reducedMotion: 'reduce' });
    await listButton(p).click();
    await isShown(sheet(p), { timeout: SHEET_WAIT_MS });
    await checkTabWrap(p, sheet(p), env.log, 'HomeView 清單 sheet');
    await p.keyboard.press('Escape');
    await checkClosed(env, p, 'Tab 循環後 Escape ');
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
    const popped = await isShown(auto, { timeout: SHEET_WAIT_MS });
    if (popped) await p.keyboard.press('Escape');
    await isShown(auto, { state: 'detached', timeout: SHEET_WAIT_MS });
    // 自動彈冇撳過掣：閂咗焦點返頁頭 ⓘ，唔好跌去 <body>（用戶 2026-11-18 決定）
    const focused = await focusedName(p);
    env.log(
        popped && focused === 'BUTTON 節目資料',
        `HomeView 節目頁：自動彈嘅節目資料 Escape 閂咗，焦點返頁頭 ⓘ（自動彈 ${popped}、${focused}）`,
    );
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

/** 今日節目頁：開頁等自動播第一個節目 */
const openToday = async (env, contextOptions = {}) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, {
        viewport: SQUARE,
        ...contextOptions,
    });
    await p.goto(`${env.base}${TODAY_ROUTE}`);
    await ensurePlaying(p);
    return { ctx, p };
};

/** 今日節目頁嘅 selector 格、清單掣、唱片同有冇出界 */
const lookToday = (p) =>
    p.evaluate((selectorQuery) => {
        const box = (el) => {
            const r = el?.getBoundingClientRect();
            return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
        };
        const selector = document.querySelector(selectorQuery);
        const cells = [...(selector?.querySelectorAll('button') ?? [])];
        const header = document.querySelector('main header');
        const list = [...(header?.querySelectorAll('button') ?? [])].find((b) =>
            b.getAttribute('aria-label')?.startsWith('節目表'),
        );
        const gauge = document.querySelector('[data-player-gauge]');
        const outside = [...document.querySelectorAll('main button, main [role="slider"]')]
            .filter((el) => !selector?.contains(el))
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
            header: box(header),
            gauge: box(gauge),
            disc: box(gauge?.querySelector('[class*="large"]')),
            selector: box(selector),
            selectorScroll: selector ? selector.scrollWidth - selector.clientWidth : 0,
            // 兩邊淡出位（padding-inline）入面唔算見到嘅格
            selectorInner: selector
                ? selector.clientWidth -
                  2 * Number.parseFloat(getComputedStyle(selector).paddingLeft)
                : 0,
            cellWidth: cells[0]?.getBoundingClientRect().width ?? 0,
            cells: cells.length,
            disabled: cells.filter((b) => b.disabled).length,
            current: cells.findIndex((b) => b.getAttribute('aria-current') === 'true'),
            frame: cells
                .map((b) => getComputedStyle(b).boxShadow)
                .map((shadow) => shadow !== 'none'),
            stack: document.querySelector('[aria-roledescription="節目卡疊"]') !== null,
            dots: document.querySelector('[role="group"][aria-label^="今日第"]') !== null,
            listLabel: list?.getAttribute('aria-label') ?? null,
            badge: list?.querySelector('[aria-hidden="true"]:not(svg)')?.textContent ?? null,
            outside,
        };
    }, SELECTOR);

/** 今日節目頁：普通播放器（唱片置中、頁頭下面 16px）、冇卡疊 / 指示點，selector 貼底、全部喺畫面入面 */
const checkTodayLayout = async (env) => {
    const { ctx, p } = await openToday(env);
    const l = await lookToday(p);
    const discCentre = l.disc ? l.disc.x + l.disc.w / 2 : 0;
    const headerBottom = l.header ? l.header.y + l.header.h : 0;
    env.log(
        !l.stack &&
            !l.dots &&
            l.disc !== null &&
            near(discCentre, l.vw / 2) &&
            l.gauge !== null &&
            near(l.gauge.y - headerBottom, HEADER_GAP_PX),
        `HomeView 今日節目：普通播放器、冇卡疊 / 指示點，唱片置中、離頁頭 ${HEADER_GAP_PX}px（${JSON.stringify({ disc: l.disc, gauge: l.gauge, stack: l.stack, dots: l.dots })}）`,
    );
    const selectorBottom = l.selector ? l.selector.y + l.selector.h : Infinity;
    const gaugeBottom = l.gauge ? l.gauge.y + l.gauge.h : Infinity;
    env.log(
        selectorBottom <= l.vh &&
            l.vh - selectorBottom <= STRIP_BOTTOM_MAX_GAP_PX &&
            (l.selector?.y ?? 0) >= gaugeBottom,
        `HomeView 今日節目：selector 喺唱片下面、貼近底邊（${JSON.stringify(l.selector)}）`,
    );
    env.log(
        l.badge === String(l.cells) &&
            l.listLabel === `節目表，共 ${l.cells} 個節目` &&
            l.cells - l.disabled === TODAY_PLAYABLE,
        `HomeView 今日節目：清單掣 badge ${l.badge} = 今日節目數 ${l.cells}（播得 ${l.cells - l.disabled} / 預期 ${TODAY_PLAYABLE}）`,
    );
    env.log(
        l.scrollW <= l.vw && l.scrollH <= l.vh && l.outside === 0,
        `HomeView 今日節目：全部喺畫面入面（捲動 ${l.scrollW}×${l.scrollH}，出界掣 ${l.outside}）`,
    );
    await ctx.close();
};

/** 撳 selector 嗰格（用格名；未上架嗰啲 aria-label 有「，未上架」） */
const selectorCell = (p, name) =>
    p.getByRole('list', { name: '揀今日節目' }).getByRole('button', { name, exact: true });

const sheetToday = (p) => p.getByRole('dialog', { name: '節目表' });
/** 「today info seen」記錄（src TODAY_INFO_SEEN_STORAGE_KEY；刻意寫死做獨立對照） */
const TODAY_INFO_SEEN_KEY = '903player:today-info-seen:v1';

/** 鎖屏資料嘅標題（播緊邊個節目） */
const sessionTitle = (p) => p.evaluate(() => navigator.mediaSession.metadata?.title ?? '');

/**
 * selector：揀中嗰格有外框、其他冇；未上架灰色停用（撳唔到）；撳另一格轉節目（audio 換、外框跟住搬）；
 * 多過 4 個只見到 4 格、左右捲；捲咗去尾再由節目表揀返第一個，第一格捲返入畫面
 */
const checkSelector = async (env) => {
    const { ctx, p } = await openToday(env);
    const before = await lookToday(p);
    env.log(
        before.current === 0 &&
            before.frame.filter(Boolean).length === 1 &&
            before.frame[0] === true &&
            before.disabled > 0,
        `HomeView 今日節目 selector：第一格揀中有外框（${before.frame}），${before.disabled} 格未上架停用`,
    );
    const firstTitle = await sessionTitle(p);
    const disabledCell = p.locator(`${SELECTOR} button:disabled`).first();
    const disabledName = await disabledCell.getAttribute('aria-label');
    env.log(
        disabledName?.endsWith('，未上架') === true && (await disabledCell.isDisabled()),
        `HomeView 今日節目 selector：未上架格停用、讀屏講「未上架」（${disabledName}）`,
    );
    await selectorCell(p, 'Bad Girl大過佬').click();
    await succeeds(
        p.waitForFunction(
            (q) => document.querySelector(`${q} button[aria-current="true"]`)?.textContent,
            SELECTOR,
            { timeout: SHEET_WAIT_MS },
        ),
    );
    await succeeds(
        p.waitForFunction(
            () => navigator.mediaSession.metadata?.title?.includes('Bad Girl') === true,
            undefined,
            { timeout: SHEET_WAIT_MS },
        ),
    );
    const secondTitle = await sessionTitle(p);
    const after = await lookToday(p);
    env.log(
        after.current === 1 &&
            after.frame[1] === true &&
            after.frame[0] === false &&
            secondTitle.includes('Bad Girl') &&
            !firstTitle.includes('Bad Girl'),
        `HomeView 今日節目 selector：撳 Bad Girl 轉節目（${firstTitle} → ${secondTitle}），外框搬去第二格（${after.frame}）`,
    );
    const visible = Math.round(before.selectorInner / before.cellWidth);
    env.log(
        before.cells > SELECTOR_VISIBLE &&
            visible === SELECTOR_VISIBLE &&
            before.selectorScroll > 0,
        `HomeView 今日節目 selector：${before.cells} 格多過 ${SELECTOR_VISIBLE}，一次見到 ${visible} 格、可以左右捲（${before.selectorScroll}px）`,
    );
    // 捲去尾（第一格捲出畫面），再由節目表揀返第一個節目：第一格要捲返入畫面
    const scrolledAway = await p.locator(SELECTOR).evaluate((el) => {
        el.scrollTo({ left: el.scrollWidth });
        return el.scrollLeft >= (el.querySelector('li')?.getBoundingClientRect().width ?? 0);
    });
    await p.getByRole('button', { name: `節目表，共 ${before.cells} 個節目` }).click();
    await sheetToday(p)
        .getByRole('button', { name: /^播放 在晴朗的一天出發/ })
        .click();
    await p.keyboard.press('Escape');
    const revealed = await succeeds(
        p.waitForFunction(
            (q) => {
                const list = document.querySelector(q);
                const cell = list?.querySelector('button[aria-current="true"]');
                if (!list || !cell || cell.closest('li') !== list.firstElementChild) return false;
                const l = list.getBoundingClientRect();
                const c = cell.getBoundingClientRect();
                return c.left >= l.left - 0.5 && c.right <= l.right + 0.5;
            },
            SELECTOR,
            { timeout: SHEET_WAIT_MS },
        ),
    );
    env.log(
        scrolledAway && revealed,
        `HomeView 今日節目 selector：捲走第一格（${scrolledAway}）再轉返第一個節目，揀中嗰格捲返入畫面（${revealed}）`,
    );
    await ctx.close();
};

/** 清單掣開今日節目表 sheet：行數 = badge、有播出時間同收聽狀態、未上架數；Escape 閂焦點返清單掣 */
const checkTodaySheet = async (env) => {
    const { ctx, p } = await openToday(env);
    const l = await lookToday(p);
    const button = p.getByRole('button', { name: l.listLabel ?? '' });
    await button.click();
    const shown = await isShown(sheetToday(p), { timeout: SHEET_WAIT_MS });
    const state = await sheetToday(p).evaluate((dialog) => ({
        rows: dialog.querySelectorAll('li[data-today-row]').length,
        text: dialog.textContent ?? '',
        focused: dialog.contains(document.activeElement),
    }));
    const unavailable = `${l.disabled} 個未上架`;
    env.log(
        shown &&
            state.focused &&
            state.rows === l.cells &&
            state.text.includes(unavailable) &&
            /\d{2}:\d{2}/.test(state.text) &&
            state.text.includes('播放中'),
        `HomeView 今日節目表 sheet：${state.rows} 行（badge ${l.badge}）、「${unavailable}」、有播出時間同收聽狀態、焦點入表`,
    );
    await p.keyboard.press('Escape');
    const gone = await isShown(sheetToday(p), { state: 'detached', timeout: SHEET_WAIT_MS });
    const focused = await focusedName(p);
    env.log(
        gone && focused === `BUTTON ${l.listLabel}`,
        `HomeView 今日節目表 sheet Escape 閂：焦點返清單掣（${focused}）`,
    );
    await ctx.close();
};

/** 內建 catalog + 指定節目嘅簡介（有資料先有 ⓘ） */
const catalogWithSummaries = (base, summaries) => {
    const imageBase = new URL(CATALOG_FOLDER, base).pathname;
    const doc = buildCatalogDocument({ catalogDir: CATALOG_DIR.pathname, imageBase });
    const shows = doc.shows.map((s) =>
        summaries[s.id] ? { ...s, definition: { ...s.definition, summary: summaries[s.id] } } : s,
    );
    return JSON.stringify({ ...doc, shows });
};

/** ⓘ 喺頁頭最右、開而家個節目嘅資料；轉節目之後開返就係新節目嘅 */
const checkTodayInfo = async (env) => {
    const summaries = { sunnyday: '晴朗示範簡介', badgirl: 'BadGirl示範簡介' };
    const { ctx, p } = await openWithCatalog(env, {
        catalogBody: catalogWithSummaries(env.base, summaries),
        contextOptions: { viewport: SQUARE },
    });
    // 已經睇過今日節目資料（第一次入自動開節目表另外驗，checkTodayFirstVisit）
    await ctx.addInitScript((key) => localStorage.setItem(key, '1'), TODAY_INFO_SEEN_KEY);
    await p.goto(`${env.base}${TODAY_ROUTE}`);
    await ensurePlaying(p);
    const infoSheet = p.getByRole('dialog', { name: '節目資料' });
    const autoPopped = await isShown(infoSheet, { timeout: 500 });
    const labels = await p.evaluate(() =>
        [...document.querySelectorAll('main header button')].map((b) =>
            b.getAttribute('aria-label'),
        ),
    );
    const openInfo = async () => {
        await p.getByRole('button', { name: '節目資料' }).click();
        await isShown(infoSheet, { timeout: SHEET_WAIT_MS });
        const text = (await infoSheet.textContent()) ?? '';
        await p.keyboard.press('Escape');
        await isShown(infoSheet, { state: 'detached', timeout: SHEET_WAIT_MS });
        return text;
    };
    const first = await openInfo();
    await selectorCell(p, 'Bad Girl大過佬').click();
    const second = await openInfo();
    env.log(
        !autoPopped &&
            labels.at(-1) === '節目資料' &&
            labels.at(-2)?.startsWith('節目表') === true &&
            first.includes(summaries.sunnyday) &&
            second.includes(summaries.badgirl),
        `HomeView 今日節目 ⓘ：頁頭 ${labels.join(' / ')}，唔自動彈（${autoPopped}），開晴朗資料（${first.includes(summaries.sunnyday)}），轉 Bad Girl 後跟住換（${second.includes(summaries.badgirl)}）`,
    );
    await ctx.close();
};

/** selector 兩邊淡出狀態、mask、第一 / 最尾完全見到嗰格同淡出位嘅距離 */
const fadeState = (p) =>
    p.locator(SELECTOR).evaluate((el) => {
        const inset = Number.parseFloat(getComputedStyle(el).paddingLeft);
        const box = el.getBoundingClientRect();
        const cells = [...el.querySelectorAll('button')].map((b) => b.getBoundingClientRect());
        // 完全喺 selector 入面嘅格（唔計淡出位）都唔可以壓住淡出位
        const shown = cells.filter((c) => c.left >= box.left - 0.5 && c.right <= box.right + 0.5);
        return {
            start: el.dataset.fadeStart,
            end: el.dataset.fadeEnd,
            mask: getComputedStyle(el).maskImage,
            inset,
            clearStart: shown.every((c) => c.left >= box.left + inset - 0.5),
            clearEnd: shown.every((c) => c.right <= box.right - inset + 0.5),
            shown: shown.length,
        };
    });

const scrollSelector = (p, where) =>
    p.locator(SELECTOR).evaluate((el, to) => {
        const left = { start: 0, middle: (el.scrollWidth - el.clientWidth) / 2 }[to];
        el.scrollTo({ left: left ?? el.scrollWidth, behavior: 'instant' });
    }, where);

/** 等 scroll 事件更新咗 data-fade-* */
const waitFade = (p, start, end) =>
    succeeds(
        p.waitForFunction(
            ([q, s, e]) => {
                const el = document.querySelector(q);
                return el?.dataset.fadeStart === s && el?.dataset.fadeEnd === e;
            },
            [SELECTOR, start, end],
            { timeout: SHEET_WAIT_MS },
        ),
    );

/**
 * 捲動提示（用戶 2026-11-18）：喺頭淨係尾淡出、中間兩邊、去到尾淨係頭；
 * 完全見到嘅格（連揀中外框 / focus 環）唔會壓住淡出位
 */
const checkSelectorFade = async (env) => {
    const { ctx, p } = await openToday(env);
    const atStart = await fadeState(p);
    env.log(
        atStart.start === 'false' &&
            atStart.end === 'true' &&
            atStart.mask !== 'none' &&
            atStart.inset > 0 &&
            atStart.clearStart &&
            atStart.clearEnd &&
            atStart.shown === SELECTOR_VISIBLE,
        `HomeView 今日節目 selector 喺頭：淨係尾淡出、${atStart.shown} 格完全見到唔壓淡出位（${JSON.stringify(atStart)}）`,
    );
    await scrollSelector(p, 'middle');
    const middleOk = await waitFade(p, 'true', 'true');
    env.log(middleOk, `HomeView 今日節目 selector 捲到中間：兩邊淡出（${middleOk}）`);
    await scrollSelector(p, 'end');
    const endOk = await waitFade(p, 'true', 'false');
    const atEnd = await fadeState(p);
    env.log(
        endOk && atEnd.clearStart && atEnd.clearEnd && atEnd.mask !== 'none',
        `HomeView 今日節目 selector 捲到尾：淨係頭淡出、格唔壓淡出位（${JSON.stringify(atEnd)}）`,
    );
    await scrollSelector(p, 'start');
    const backOk = await waitFade(p, 'false', 'true');
    env.log(backOk, `HomeView 今日節目 selector 捲返頭：頭冇淡出（${backOk}）`);
    await ctx.close();
};

/** 今日節目有資料（晴朗 + Bad Girl 簡介）嘅 catalog，未睇過今日節目資料 */
const FIRST_VISIT_SUMMARIES = { sunnyday: '晴朗示範簡介', badgirl: 'BadGirl示範簡介' };

const openFirstVisit = async (env, contextOptions = {}) => {
    const { ctx, p } = await openWithCatalog(env, {
        catalogBody: catalogWithSummaries(env.base, FIRST_VISIT_SUMMARIES),
        contextOptions: { viewport: SQUARE, ...contextOptions },
    });
    await p.goto(`${env.base}${TODAY_ROUTE}`);
    return { ctx, p };
};

/** 自動開嘅節目表：展開咗資料嘅行數、有冇兩個簡介 */
const firstVisitSheet = (p) =>
    sheetToday(p).evaluate((dialog, summaries) => {
        const text = dialog.textContent ?? '';
        return {
            expanded: dialog.querySelectorAll('li[data-today-row][data-expanded="true"]').length,
            summaries: summaries.every((s) => text.includes(s)),
        };
    }, Object.values(FIRST_VISIT_SUMMARIES));

/**
 * 第一次入：自動開節目表 sheet、每行展開全部今日節目資料、記低睇過；Escape 閂焦點返清單掣；
 * 再入（reload）唔再自動開
 */
const checkTodayFirstVisit = async (env) => {
    const { ctx, p } = await openFirstVisit(env, { reducedMotion: 'reduce' });
    const popped = await isShown(sheetToday(p), { timeout: SHEET_WAIT_MS });
    const content = popped ? await firstVisitSheet(p) : { expanded: 0, summaries: false };
    const ownInfo = await p.getByRole('dialog', { name: '節目資料' }).count();
    const seen = await p.evaluate((key) => localStorage.getItem(key), TODAY_INFO_SEEN_KEY);
    env.log(
        popped && content.expanded === 2 && content.summaries && ownInfo === 0 && seen !== null,
        `HomeView 今日節目第一次入：自動開節目表、${content.expanded} 行展開資料（簡介 ${content.summaries}）、冇開而家個節目嘅 ⓘ（${ownInfo}）、記低睇過（${seen}）`,
    );
    await p.keyboard.press('Escape');
    const gone = await isShown(sheetToday(p), { state: 'detached', timeout: SHEET_WAIT_MS });
    const focused = await focusedName(p);
    env.log(
        gone && focused?.startsWith('BUTTON 節目表，共') === true,
        `HomeView 今日節目第一次入自動開嘅節目表 Escape 閂：焦點返清單掣（${focused}）`,
    );
    await p.reload();
    await ensurePlaying(p);
    const again = await isShown(sheetToday(p), { timeout: 1000 });
    env.log(!again, `HomeView 今日節目再入：唔再自動開節目表（${again}）`);
    await ctx.close();
};

/** C-025：第一次入自動開嘅節目表用滑鼠撳遮罩閂，清單掣冇 focus 環 */
const checkTodayFirstVisitPointerClose = async (env) => {
    const { ctx, p } = await openFirstVisit(env);
    const opened = await isShown(sheetToday(p), { timeout: SHEET_WAIT_MS });
    const point = opened
        ? await scrimPoint(p, p.getByTestId('list-sheet-backdrop'), sheetToday(p))
        : { onScrim: false };
    if (point.onScrim) await p.mouse.click(point.x, point.y);
    const closed = await isShown(sheetToday(p), { state: 'detached', timeout: SHEET_WAIT_MS });
    env.log(
        opened && point.onScrim && closed,
        `HomeView 今日節目第一次入自動開節目表滑鼠撳遮罩閂咗（自動開 ${opened}、撳中遮罩 ${point.onScrim}、閂咗 ${closed}）`,
    );
    const button = p.getByRole('button', { name: /^節目表，共/ });
    await checkNoPointerRing(button, env.log, 'HomeView 今日節目第一次入自動開節目表滑鼠撳遮罩');
    await ctx.close();
};

/** 對照：現有手機今日節目頁照舊（卡疊、節目表喺頁面、冇清單掣 / selector） */
const checkPhoneTodayUnchanged = async (env) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport: PHONE });
    await p.goto(`${env.base}${TODAY_ROUTE}`);
    await ensurePlaying(p);
    const l = await lookToday(p);
    const schedule = await p.getByRole('region', { name: '節目表' }).isVisible();
    env.log(
        l.stack && schedule && l.cells === 0 && l.listLabel === null,
        `現有手機今日節目頁照舊：卡疊（${l.stack}）、節目表喺頁面（${schedule}）、冇 selector / 清單掣`,
    );
    await ctx.close();
};

const SCENARIOS = [
    ['HomeView 節目頁版面', checkLayout],
    ['HomeView 清單 sheet 開閂', checkSheet],
    ['HomeView 清單 sheet 收藏自動開', checkAutoOpenedFocus],
    ['HomeView 清單 sheet 收藏自動開滑鼠閂', checkAutoOpenedPointerClose],
    ['HomeView 清單 sheet Tab 循環', checkTabTrap],
    ['HomeView 清單 sheet 減少動態', checkReducedMotion],
    ['HomeView 頁頭 ⓘ', checkInfoInHeader],
    ['HomeView 現有手機對照', checkPhoneUnchanged],
    ['HomeView 今日節目版面', checkTodayLayout],
    ['HomeView 今日節目 selector', checkSelector],
    ['HomeView 今日節目表 sheet', checkTodaySheet],
    ['HomeView 今日節目 selector 淡出', checkSelectorFade],
    ['HomeView 今日節目 ⓘ', checkTodayInfo],
    ['HomeView 今日節目第一次入', checkTodayFirstVisit],
    ['HomeView 今日節目第一次入滑鼠閂', checkTodayFirstVisitPointerClose],
    ['HomeView 現有手機今日節目對照', checkPhoneTodayUnchanged],
];

export const runSquareChecks = async (env) => {
    for (const [name, check] of SCENARIOS) {
        await runSection(env.log, name, () => check(env), env.browser);
    }
};
