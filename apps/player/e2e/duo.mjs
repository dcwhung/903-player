// iPhone Duo e2e（P10，v2.0.0，_mockups_/iphone-duo）：用 Progressier simulator 實測嘅 viewport 驗版面。
// 闔上・橫（612×426，窄過橫版斷點 640）行手機打橫兩欄版面；四種姿勢四邊邊框 24px。
// 現有裝置唔受影響由 `npm run e2e:visual` 驗；呢度只留一個現有手機做對照。
// 每個情境用獨立 context
import { buildCatalogDocument } from '../scripts/buildCatalogJson.mjs';
import { BANNER_ALT, PHONE, ensurePlaying, newE2EPage, runSection } from './harness.mjs';
import { BOOKMARK_STORAGE_KEY, BOOKMARK_STORE_VERSION } from './bookmark.mjs';
import { PROGRESS_STORAGE_KEY } from './hiddenPlayback.mjs';
import { CATALOG_DIR, CATALOG_FOLDER, openWithCatalog } from './remoteCatalog.mjs';
import { SAMPLE_RECORDINGS } from './sampleData.mjs';

/** Progressier simulator 實測（_mockups_/iphone-duo）；刻意寫死做獨立對照，唔 import src 常數 */
const COVER_PORTRAIT = { width: 426, height: 612 };
const COVER_LANDSCAPE = { width: 612, height: 426 };
const SEATED = { width: 612, height: 438 };
const OPEN_LANDSCAPE = { width: 876, height: 612 };
const OPEN_PORTRAIT = { width: 612, height: 876 };
const POSTURES = [
    ['闔上・直', COVER_PORTRAIT],
    ['闔上・橫', COVER_LANDSCAPE],
    ['Seated', SEATED],
    ['打開・橫', OPEN_LANDSCAPE],
    ['打開・直', OPEN_PORTRAIT],
];
// Duo 主頁格邊離畫面邊：--home-gutter（16）+ 四邊多留嘅 8；現有手機係 16
const DUO_EDGE_PX = 24;
const PHONE_EDGE_PX = 16;
// 闔上・橫清單欄佔 main 內容闊（Page.module.css Duo 區塊）；現有手機打橫係 54%
const COVER_LIST_SHARE = 0.46;
// subpixel 捨入容差
const EDGE_TOLERANCE_PX = 1;
const SHARE_TOLERANCE = 0.01;
// 今日節目行尾播放 / 暫停 icon（TodayShowList --today-row-icon）；長名開跑馬燈都唔可以俾擠窄（W-782）
const ROW_ICON_PX = 22;
// 等跑馬燈開始（開咗先會撐闊文字，擠窄 icon）
const MARQUEE_SETTLE_MS = 2500;
const SHOW_ROUTE = '#/show/gongzi';
// 第一次入短篇劇集頁，全集表自己彈出（dramaPages.mjs SERIES_ROUTE）
const SERIES_ROUTE = '#/drama/chisee';
// 等全集表滑入完（減少動態以外都夠）
const SHEET_SETTLE_MS = 800;
// 主頁內容底同 mini player 之間（HomePage.module.css --space-3；W-786）
const MINI_GAP_PX = 12;
// 播緊公子會時入另一個節目頁，右邊出內頁把手
const OTHER_SHOW_ROUTE = '#/show/sunnyday';
// 闊橫版（打開・橫）右邊預留嘅把手位（tokens.css --home-handle-reserve；同現有闊橫版一樣）
const HANDLE_RESERVE_PX = 30;
// 資料表：公子會有簡介先會自己彈出（catalog.json 加返）
const INFO_SHOW_ID = 'gongzi';
const TODAY_ROUTE = '#/today';
const WAIT_MS = 5000;

const near = (value, expected, tolerance = EDGE_TOLERANCE_PX) =>
    Math.abs(value - expected) <= tolerance;

const openHome = async (p, base) => {
    await p.goto(base);
    await p.locator('nav[aria-busy="false"]').waitFor({ timeout: WAIT_MS });
};

/** 主頁：節目格第一格嘅左邊、最右一格嘅右邊、最頂嘅內容（橫額 / 分類掣）離畫面邊幾遠，同 mini player 左右 */
const homeEdges = (p) =>
    p.evaluate((bannerAlt) => {
        // 直版節目格分頁：其他頁喺畫面右邊外面，唔計
        const tiles = [...document.querySelectorAll('nav button')]
            .map((el) => el.getBoundingClientRect())
            .filter((rect) => rect.width > 0 && rect.left < window.innerWidth && rect.right > 0);
        const banner = document.querySelector(`img[alt="${bannerAlt}"]`)?.getBoundingClientRect();
        // 分類掣外面嗰條底（掣本身喺入面縮咗少少）
        const tabs = document.querySelector('[data-tab-id]')?.parentElement.getBoundingClientRect();
        // 闊橫版：右邊係播放卡（入面都有「正在播放」region），冇 mini player
        const card = document.querySelector('section[data-home-card]')?.getBoundingClientRect();
        const mini = card
            ? undefined
            : document.querySelector('[aria-label^="正在播放"]')?.getBoundingClientRect();
        const rights = [...tiles.map((rect) => rect.right), ...(card ? [card.right] : [])];
        const tops = [banner?.top, tabs?.top, ...tiles.map((rect) => rect.top)].filter(
            (top) => top !== undefined,
        );
        // 短提示離底（--toast-offset-bottom 跟 mini player，用戶 2026-11-18 揀 B）
        const probe = document.createElement('div');
        probe.style.width = 'var(--toast-offset-bottom)';
        document.body.append(probe);
        const toastBottom = probe.getBoundingClientRect().width;
        probe.remove();
        return {
            toastBottom,
            viewport: window.innerWidth,
            left: Math.min(...tiles.map((rect) => rect.left)),
            right: window.innerWidth - Math.max(...rights),
            cardBottom: card ? window.innerHeight - card.bottom : null,
            // main 內容底（扣 padding）同 mini player 頂之間（現有手機 = --space-3 = 12）
            miniGap: mini
                ? mini.top -
                  (() => {
                      const main = document.querySelector('main');
                      return (
                          main.getBoundingClientRect().bottom -
                          parseFloat(getComputedStyle(main).paddingBottom)
                      );
                  })()
                : null,
            top: Math.min(...tops),
            bannerTop: banner?.top ?? null,
            firstTileTop: tiles[0]?.top ?? null,
            mini: mini
                ? {
                      left: mini.left,
                      right: window.innerWidth - mini.right,
                      bottom: window.innerHeight - mini.bottom,
                  }
                : null,
        };
    }, BANNER_ALT);

const checkHomeEdges = async (env, label, viewport) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport });
    await openHome(p, env.base);
    const edges = await homeEdges(p);
    env.log(
        near(edges.toastBottom, DUO_EDGE_PX),
        `Duo ${label} 主頁：短提示離底 ${DUO_EDGE_PX}px（${edges.toastBottom}）`,
    );
    if (edges.cardBottom !== null) {
        env.log(
            near(edges.cardBottom, DUO_EDGE_PX),
            `Duo ${label} 主頁：播放卡離底 ${DUO_EDGE_PX}px（${edges.cardBottom}）`,
        );
    }
    if (edges.miniGap !== null) {
        env.log(
            near(edges.miniGap, MINI_GAP_PX),
            `Duo ${label} 主頁：內容底同 mini player 之間 ${MINI_GAP_PX}px，同現有手機一樣（${edges.miniGap}）`,
        );
    }
    // mini player（闊橫版係播放卡，冇 mini player）：左右底同格邊一樣 24px（用戶 2026-11-18 揀 B）
    if (edges.mini) {
        env.log(
            near(edges.mini.left, DUO_EDGE_PX) &&
                near(edges.mini.right, DUO_EDGE_PX) &&
                near(edges.mini.bottom, DUO_EDGE_PX),
            `Duo ${label} 主頁：mini player 左右底 ${DUO_EDGE_PX}px（左 ${edges.mini.left}、右 ${edges.mini.right}、底 ${edges.mini.bottom}）`,
        );
    }
    env.log(
        near(edges.left, DUO_EDGE_PX) && near(edges.right, DUO_EDGE_PX),
        `Duo ${label} 主頁：左右邊框 ${DUO_EDGE_PX}px（左 ${edges.left}、右 ${edges.right}）`,
    );

    env.log(
        near(edges.top, DUO_EDGE_PX),
        `Duo ${label} 主頁：頂部邊框 ${DUO_EDGE_PX}px（${edges.top}）`,
    );
    await ctx.close();
};

/** 現有手機（390×844）做對照：邊框仲係 16px，冇食到 Duo 嘅規則 */
const checkPhoneUnchanged = async (env) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport: PHONE });
    await openHome(p, env.base);
    const edges = await homeEdges(p);
    env.log(
        near(edges.left, PHONE_EDGE_PX) && near(edges.right, PHONE_EDGE_PX),
        `現有手機主頁：節目格左右邊框仲係 ${PHONE_EDGE_PX}px（左 ${edges.left}、右 ${edges.right}）`,
    );
    await ctx.close();
};

/** 闔上・橫主頁：同手機打橫一樣橫額入格（同第一行節目格同一行） */
const checkCoverLandscapeHome = async (env) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport: COVER_LANDSCAPE });
    await openHome(p, env.base);
    const edges = await homeEdges(p);
    env.log(
        edges.bannerTop !== null && near(edges.bannerTop, edges.firstTileTop),
        `Duo 闔上・橫主頁：橫額入格、同第一格同一行（橫額頂 ${edges.bannerTop}、第一格頂 ${edges.firstTileTop}）`,
    );
    await ctx.close();
};

/** 節目頁 / 今日節目頁：清單同播放掣嘅位置 */
const columns = (p) =>
    p.evaluate(() => {
        const main = document.querySelector('main');
        const style = getComputedStyle(main);
        const content =
            main.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const list = document.querySelector('ul, ol')?.getBoundingClientRect();
        const play = [...document.querySelectorAll('button')]
            .find((el) => ['播放', '暫停'].includes(el.getAttribute('aria-label')))
            ?.getBoundingClientRect();
        return {
            content,
            listLeft: list?.left ?? null,
            listRight: list?.right ?? null,
            listWidth: list?.width ?? null,
            playLeft: play?.left ?? null,
            playTop: play?.top ?? null,
            listTop: list?.top ?? null,
        };
    });

const checkCoverLandscapeColumns = async (env, label, viewport, route) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport });
    await p.goto(`${env.base}${route}`);
    await ensurePlaying(p);
    const look = await columns(p);
    env.log(
        look.listRight !== null && look.playLeft !== null && look.playLeft > look.listRight,
        `Duo ${label}：兩欄，播放器喺清單右邊（清單右 ${look.listRight}、播放掣左 ${look.playLeft}）`,
    );
    const share = look.listWidth / look.content;
    env.log(
        look.listWidth !== null && share <= COVER_LIST_SHARE + SHARE_TOLERANCE,
        `Duo ${label}：清單欄唔超過 ${COVER_LIST_SHARE * 100}%（${(share * 100).toFixed(1)}%）`,
    );
    await ctx.close();
};

/** 闔上・直照舊係直版：播放器喺清單上面 */
const checkCoverPortraitStacked = async (env) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport: COVER_PORTRAIT });
    await p.goto(`${env.base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    const look = await columns(p);
    env.log(
        look.playTop !== null && look.listTop !== null && look.playTop < look.listTop,
        `Duo 闔上・直節目頁：照舊直版，播放器喺清單上面（播放掣頂 ${look.playTop}、清單頂 ${look.listTop}）`,
    );
    await ctx.close();
};

/** 今日節目：每行行尾 icon 都係 ROW_ICON_PX 闊 */
const checkTodayRowIcons = async (env, label, viewport) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport });
    await p.goto(`${env.base}${TODAY_ROUTE}`);
    await ensurePlaying(p);
    await p.waitForTimeout(MARQUEE_SETTLE_MS);
    const widths = await p.evaluate(() =>
        [...document.querySelectorAll('li button > svg')].map(
            (svg) => Math.round(svg.getBoundingClientRect().width * 10) / 10,
        ),
    );
    env.log(
        widths.length > 0 && widths.every((width) => near(width, ROW_ICON_PX)),
        `Duo ${label}今日節目：行尾 icon 全部 ${ROW_ICON_PX}px 闊（${widths.join('、')}）`,
    );
    await ctx.close();
};

/** 打橫姿勢嘅廣播劇頁：左欄全集表貼畫面左邊同底邊（伸出邊框，用戶 2026-11-18） */
const checkDockedSheetFlush = async (env, label, viewport) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport });
    await p.goto(`${env.base}${SERIES_ROUTE}`);
    const sheet = p.getByRole('dialog', { name: '全集' });
    await sheet.waitFor({ timeout: WAIT_MS });
    await p.waitForTimeout(SHEET_SETTLE_MS);
    const gap = await sheet.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, bottom: window.innerHeight - rect.bottom };
    });
    env.log(
        near(gap.left, 0) && near(gap.bottom, 0),
        `Duo ${label}廣播劇頁：全集表貼畫面左邊同底邊（左 ${gap.left}、底 ${gap.bottom}）`,
    );
    await ctx.close();
};

/** catalog.json：公子會加簡介、主持、時間，節目頁資料表先會自己彈出（同 itemInfo.mjs 一樣做法） */
const infoCatalog = (base) => {
    const doc = buildCatalogDocument({
        catalogDir: CATALOG_DIR.pathname,
        imageBase: new URL(CATALOG_FOLDER, base).pathname,
    });
    const shows = doc.shows.map((show) =>
        show.id === INFO_SHOW_ID
            ? {
                  ...show,
                  definition: {
                      ...show.definition,
                      summary: 'E2E 簡介',
                      hosts: ['甲'],
                      airTime: { start: '23:00', end: '23:45' },
                  },
              }
            : show,
    );
    return JSON.stringify({ ...doc, shows });
};

/** 打橫姿勢嘅節目頁：右欄資料表貼畫面底同右邊（打開・橫右邊留把手位；CUI-0025） */
const checkInfoSheetFlush = async (env, label, viewport, rightGap) => {
    const { ctx, p } = await openWithCatalog(env, {
        catalogBody: infoCatalog(env.base),
        contextOptions: { viewport },
    });
    await p.goto(`${env.base}${SHOW_ROUTE}`);
    const sheet = p.getByRole('dialog', { name: '節目資料' });
    await sheet.waitFor({ timeout: WAIT_MS });
    await p.waitForTimeout(SHEET_SETTLE_MS);
    const gap = await sheet.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return { right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.bottom };
    });
    env.log(
        near(gap.right, rightGap) && near(gap.bottom, 0),
        `Duo ${label}節目頁：資料表離右邊 ${rightGap}px、貼畫面底（右 ${gap.right}、底 ${gap.bottom}）`,
    );
    await ctx.close();
};

/** 打開・橫內頁把手（播緊其他節目）：貼畫面右邊，冇俾推出畫面（W-785） */
const checkOpenLandscapePageHandle = async (env) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport: OPEN_LANDSCAPE });
    await p.goto(`${env.base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    await p.goto(`${env.base}${OTHER_SHOW_ROUTE}`);
    const handle = p.locator('[data-page-handle]');
    await handle.waitFor({ timeout: WAIT_MS });
    const gap = await handle.evaluate((el) => window.innerWidth - el.getBoundingClientRect().right);
    env.log(near(gap, 0), `Duo 打開・橫節目頁：內頁把手貼住畫面右邊（離邊 ${gap}px）`);
    await ctx.close();
};

/** 打開・橫主頁閂咗播放卡：右邊緣把手貼住畫面右邊（W-783） */
const checkOpenLandscapeHandle = async (env) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport: OPEN_LANDSCAPE });
    await p.goto(`${env.base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    await p.goto(env.base);
    await p.locator('nav[aria-busy="false"]').waitFor({ timeout: WAIT_MS });
    await p.getByRole('button', { name: '關閉播放器', exact: true }).click();
    const handle = p.locator('[data-home-handle]');
    await handle.waitFor({ timeout: WAIT_MS });
    const gap = await handle.evaluate((el) => window.innerWidth - el.getBoundingClientRect().right);
    env.log(near(gap, 0), `Duo 打開・橫主頁：閂咗卡嘅把手貼住畫面右邊（離邊 ${gap}px）`);
    await ctx.close();
};

// 「最近收聽」平時固定高（tokens.css --saved-recent-height）；Duo 闔上・直跟內容、最高佢同分頁區 40%
const RECENT_HEIGHT_PX = 200;
const RECENT_TAB_SHARE = 0.4;
const SAVED_TAB = '我的收藏';
// 最近收聽最多 10 集（src/selectors/bookmarks.ts RECENT_MAX）
const RECENT_MAX = 10;
const FEW_LISTENED = 2;

/** 收藏咗最新一集、聽過最新 count 集（入主頁之前寫入 localStorage） */
const seedSavedAndListened = (ctx, count) => {
    const listened = SAMPLE_RECORDINGS.slice(-count);
    const latest = SAMPLE_RECORDINGS.at(-1);
    const bookmark = {
        kind: 'show',
        id: latest.id,
        url: latest.url,
        showId: latest.showId,
        date: latest.date,
        time: latest.time,
        addedAt: 1,
    };
    const progress = Object.fromEntries(
        listened.map((r, i) => [
            r.id,
            { position: 60, duration: 600, watched: false, updatedAt: 1000 + i },
        ]),
    );
    return ctx.addInitScript(
        (entries) => {
            for (const [key, value] of entries) localStorage.setItem(key, value);
        },
        [
            [
                BOOKMARK_STORAGE_KEY,
                JSON.stringify({ version: BOOKMARK_STORE_VERSION, items: [bookmark] }),
            ],
            [PROGRESS_STORAGE_KEY, JSON.stringify(progress)],
        ],
    );
};

/** 我的收藏 tab：成個 tab 區、最近收聽 panel、佢入面清單有冇溢出 */
const recentLook = async (env, viewport, count) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport });
    await seedSavedAndListened(ctx, count);
    await openHome(p, env.base);
    await p.getByRole('button', { name: SAVED_TAB, exact: true }).click();
    const recent = p.locator('section[data-fill]');
    await recent.waitFor({ timeout: WAIT_MS });
    const look = await recent.evaluate((el) => {
        const tab = el.closest('[data-saved-mode]').getBoundingClientRect();
        const panel = el.getBoundingClientRect();
        const list = el.querySelector('ul').parentElement;
        // 收藏 box 嘅捲動區（同一個 tab 入面最近收聽前面嗰格；唔連 --saved-gap，S-1123）
        const savedBox = el.previousElementSibling.getBoundingClientRect();
        return {
            tab: tab.height,
            recent: panel.height,
            saved: savedBox.height,
            overflows: list.scrollHeight > list.clientHeight + 1,
        };
    });
    await ctx.close();
    return look;
};

/** Duo 闔上・直：最近收聽跟內容、最高 200px 同分頁區 40%，收藏區高過佢；現有手機照舊 200px */
const checkRecentPanel = async (env) => {
    const few = await recentLook(env, COVER_PORTRAIT, FEW_LISTENED);
    env.log(
        few.recent < RECENT_HEIGHT_PX && !few.overflows,
        `Duo 闔上・直我的收藏：聽過 ${FEW_LISTENED} 集，最近收聽跟內容高（${few.recent}px，清單冇溢出 ${!few.overflows}）`,
    );
    const many = await recentLook(env, COVER_PORTRAIT, RECENT_MAX);
    const cap = Math.min(RECENT_HEIGHT_PX, many.tab * RECENT_TAB_SHARE);
    env.log(
        many.recent <= cap + EDGE_TOLERANCE_PX && many.saved > many.recent && many.overflows,
        `Duo 闔上・直我的收藏：聽過 ${RECENT_MAX} 集，最近收聽最高 ${cap.toFixed(1)}px（${many.recent}），收藏區高過佢（${many.saved}），清單喺入面捲（${many.overflows}）`,
    );
    const phone = await recentLook(env, PHONE, FEW_LISTENED);
    env.log(
        near(phone.recent, RECENT_HEIGHT_PX),
        `現有手機我的收藏：最近收聽照舊固定 ${RECENT_HEIGHT_PX}px（${phone.recent}）`,
    );
};

// 打開・橫摺位（畫面正中）：內頁清單欄右邊分隔線對齊佢（lane 4）
const HINGE_X = OPEN_LANDSCAPE.width / 2;
const INNER_ROUTES = [
    ['節目頁', SHOW_ROUTE],
    ['今日節目', TODAY_ROUTE],
    ['廣播劇頁', '#/drama/jim'],
];

/** 打開・橫內頁：清單欄（左欄，分隔線喺佢右邊）右邊 = 摺位，播放掣喺右半 */
const checkOpenLandscapeHinge = async (env, label, route) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport: OPEN_LANDSCAPE });
    await p.goto(`${env.base}${route}`);
    const sheet = p.getByRole('dialog', { name: '全集' });
    if (await sheet.isVisible().catch(() => false)) await p.keyboard.press('Escape');
    await p.locator('main [class*="_listColumn_"]').waitFor({ timeout: WAIT_MS });
    const look = await p.evaluate(() => {
        // 左欄清單（Page.module.css .listColumn，分隔線係佢右邊框）：直接搵欄，唔靠第一個清單（S-1128）
        const column = document.querySelector('main [class*="_listColumn_"]');
        const play = [...document.querySelectorAll('button')].find((el) =>
            ['播放', '暫停'].includes(el.getAttribute('aria-label')),
        );
        return {
            divider: column ? column.getBoundingClientRect().right : null,
            playLeft: play ? play.getBoundingClientRect().left : null,
        };
    });
    env.log(
        look.divider !== null && near(look.divider, HINGE_X) && look.playLeft > HINGE_X,
        `Duo 打開・橫${label}：清單欄分隔線對齊摺位 ${HINGE_X}（${look.divider}），播放掣喺右半（${look.playLeft}）`,
    );
    await ctx.close();
};

/** 打開・直主頁（lane 5a）：橫額 / 分類掣 / 節目格用盡闊度，節目格 3 欄，今日節目同最後一個節目同一行 */
const checkOpenPortraitHome = async (env) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport: OPEN_PORTRAIT });
    await openHome(p, env.base);
    const look = await p.evaluate(() => {
        const tiles = [...document.querySelectorAll('nav button')]
            .map((el) => ({
                label: el.getAttribute('aria-label') ?? el.textContent,
                r: el.getBoundingClientRect(),
            }))
            .filter(({ r }) => r.width > 0 && r.left < window.innerWidth && r.right > 0);
        const tops = [...new Set(tiles.map(({ r }) => Math.round(r.top)))];
        const firstRow = tiles.filter(({ r }) => Math.round(r.top) === tops[0]).length;
        const today = tiles.find(({ label }) => label === '今日節目');
        const before = tiles.at(-2);
        const tabs = document.querySelector('[data-tab-id]')?.parentElement.getBoundingClientRect();
        return {
            firstRow,
            todaySharesRow:
                today && before ? Math.round(today.r.top) === Math.round(before.r.top) : false,
            tabsRight: tabs ? window.innerWidth - tabs.right : null,
        };
    });
    env.log(
        look.firstRow === 3 && look.todaySharesRow && near(look.tabsRight, DUO_EDGE_PX),
        `Duo 打開・直主頁：3 欄、今日節目同最後一個節目同一行、分類掣用盡闊度（${JSON.stringify(look)}）`,
    );
    await ctx.close();
};

const SCENARIOS = [
    ['Duo 打開・直主頁', checkOpenPortraitHome],
    ...INNER_ROUTES.map(([label, route]) => [
        `Duo 打開・橫${label}摺位`,
        (env) => checkOpenLandscapeHinge(env, label, route),
    ]),
    ...POSTURES.map(([label, viewport]) => [
        `Duo ${label} 主頁邊框`,
        (env) => checkHomeEdges(env, label, viewport),
    ]),
    ['現有手機邊框對照', checkPhoneUnchanged],
    ['Duo 闔上・橫主頁', checkCoverLandscapeHome],
    [
        'Duo 闔上・橫節目頁',
        (env) => checkCoverLandscapeColumns(env, '闔上・橫節目頁', COVER_LANDSCAPE, SHOW_ROUTE),
    ],
    [
        'Duo 闔上・橫今日節目',
        (env) => checkCoverLandscapeColumns(env, '闔上・橫今日節目', COVER_LANDSCAPE, TODAY_ROUTE),
    ],
    [
        'Duo Seated 節目頁',
        (env) => checkCoverLandscapeColumns(env, 'Seated 節目頁', SEATED, SHOW_ROUTE),
    ],
    ['Duo 闔上・直節目頁', checkCoverPortraitStacked],
    ['Duo 闔上・直最近收聽', checkRecentPanel],
    ['Duo 闔上・橫今日節目 icon', (env) => checkTodayRowIcons(env, '闔上・橫', COVER_LANDSCAPE)],
    ['Duo Seated 今日節目 icon', (env) => checkTodayRowIcons(env, 'Seated', SEATED)],
    ['Duo 打開・橫把手', checkOpenLandscapeHandle],
    ['Duo 打開・橫內頁把手', checkOpenLandscapePageHandle],
    ['Duo 闔上・橫全集表', (env) => checkDockedSheetFlush(env, '闔上・橫', COVER_LANDSCAPE)],
    ['Duo 打開・橫全集表', (env) => checkDockedSheetFlush(env, '打開・橫', OPEN_LANDSCAPE)],
    ['Duo 闔上・橫資料表', (env) => checkInfoSheetFlush(env, '闔上・橫', COVER_LANDSCAPE, 0)],
    ['Duo Seated 資料表', (env) => checkInfoSheetFlush(env, 'Seated', SEATED, 0)],
    [
        'Duo 打開・橫資料表',
        (env) => checkInfoSheetFlush(env, '打開・橫', OPEN_LANDSCAPE, HANDLE_RESERVE_PX),
    ],
];

export const runDuoChecks = async (env) => {
    for (const [label, check] of SCENARIOS) {
        await runSection(env.log, label, () => check(env), env.browser);
    }
};
