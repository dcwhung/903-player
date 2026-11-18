// iPhone Duo e2e（P10，v2.0.0，_mockups_/iphone-duo）：用 Progressier simulator 實測嘅 viewport 驗版面。
// 闔上・橫（612×426，窄過橫版斷點 640）行手機打橫兩欄版面；四種姿勢四邊邊框 24px。
// 現有裝置唔受影響由 `npm run e2e:visual` 驗；呢度只留一個現有手機做對照。
// 每個情境用獨立 context
import { buildCatalogDocument } from '../scripts/buildCatalogJson.mjs';
import { BANNER_ALT, PHONE, ensurePlaying, newE2EPage, runSection } from './harness.mjs';
import { CATALOG_DIR, CATALOG_FOLDER, openWithCatalog } from './remoteCatalog.mjs';

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
    // mini player（闊橫版係播放卡，冇 mini player）：左右底同格邊一樣 24px（用戶 2026-11-18 揀 B）
    if (edges.mini) {
        env.log(
            near(edges.mini.left, DUO_EDGE_PX) &&
                near(edges.mini.right, DUO_EDGE_PX) &&
                near(edges.mini.bottom, DUO_EDGE_PX),
            `Duo ${label} 主頁：mini player 左右底 ${DUO_EDGE_PX}px（左 ${edges.mini.left}、右 ${edges.mini.right}、底 ${edges.mini.bottom}）`,
        );
    }
    // 打開・直（612 闊）主頁仲係收喺 --page-max-width 中間（lane 5 先改全闊 3 欄），左右暫時唔驗
    if (viewport !== OPEN_PORTRAIT) {
        env.log(
            near(edges.left, DUO_EDGE_PX) && near(edges.right, DUO_EDGE_PX),
            `Duo ${label} 主頁：左右邊框 ${DUO_EDGE_PX}px（左 ${edges.left}、右 ${edges.right}）`,
        );
    }
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

const SCENARIOS = [
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
    ['Duo 闔上・橫今日節目 icon', (env) => checkTodayRowIcons(env, '闔上・橫', COVER_LANDSCAPE)],
    ['Duo Seated 今日節目 icon', (env) => checkTodayRowIcons(env, 'Seated', SEATED)],
    ['Duo 打開・橫把手', checkOpenLandscapeHandle],
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
