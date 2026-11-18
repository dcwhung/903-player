// 新主頁 e2e（P10 lane 3，_mockups_/iphone-duo 打開・橫、_mockups_/home-view 主頁）：
// 左欄頂固定闊版橫額 + 分類掣 + 疊卡 scroller，右欄播放卡（左右各半，Duo 對齊摺位）；
// 冇播放卡就橫額同分類掣拉到全闊、卡改兩欄。Duo 打開・橫（876×612）同 HomeView（544×544）同一套。
// 現有裝置唔受影響由 `npm run e2e:visual` 驗。每個情境用獨立 context
import { BANNER_ALT, ensurePlaying, newE2EPage, reachesHash, runSection } from './harness.mjs';

/** 刻意寫死做獨立對照（Progressier simulator 實測 / HomeView 假設） */
const DEVICES = [
    // Duo：--home-gutter 16 + 邊框 8；摺位喺正中
    { label: 'Duo 打開・橫', viewport: { width: 876, height: 612 }, edge: 24 },
    { label: 'HomeView', viewport: { width: 544, height: 544 }, edge: 16 },
];
// 闊版橫額（banner-wide 5:1）
const BANNER_RATIO = 5;
const RATIO_TOLERANCE = 0.05;
const EDGE_TOLERANCE_PX = 1;
const SHOW_ROUTE = '#/show/gongzi';
const OPEN_HASH = '#/show/badgirl';
const SHELF = '節目';
// 星期日：假錄音冇節目，主頁冇播放卡（同 homeWide.mjs 一樣）
const E2E_SUNDAY = '2026-11-29T22:30:00+08:00';
const WAIT_MS = 5000;

const near = (value, expected, tolerance = EDGE_TOLERANCE_PX) =>
    Math.abs(value - expected) <= tolerance;

const openHome = async (p, base) => {
    await p.goto(base);
    await p.locator('nav[aria-busy="false"]').waitFor({ timeout: WAIT_MS });
};

/** 左欄同右邊播放卡嘅位置 */
const look = (p) =>
    p.evaluate(
        ({ bannerAlt, shelfName }) => {
            const box = (el) => el?.getBoundingClientRect() ?? null;
            const banner = box(document.querySelector(`img[alt="${bannerAlt}"]`));
            const tabs = box(document.querySelector('[data-tab-id]')?.parentElement);
            const shelf = document.querySelector(`nav[aria-label="${shelfName}"]`);
            const tiles = [...(shelf?.children ?? [])].map((el) => el.getBoundingClientRect());
            const card = box(document.querySelector('section[data-home-card]'));
            return {
                vw: window.innerWidth,
                vh: window.innerHeight,
                banner,
                tabs,
                shelf: box(shelf),
                stacked: shelf?.hasAttribute('data-stacked') ?? null,
                firstTwo: tiles.slice(0, 2).map((r) => ({ left: r.left, top: r.top })),
                card,
            };
        },
        { bannerAlt: BANNER_ALT, shelfName: SHELF },
    );

/** 有播放卡：左欄橫額 5:1 喺頂、同分類掣一樣闊；一欄疊卡用盡高度；右邊播放卡由正中開始 */
const checkSplit = async (env, { label, viewport, edge }) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport });
    await p.goto(`${env.base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    await openHome(p, env.base);
    const l = await look(p);
    const ratio = l.banner ? l.banner.width / l.banner.height : 0;
    env.log(
        l.banner !== null &&
            near(l.banner.left, edge) &&
            near(l.banner.top, edge) &&
            near(ratio, BANNER_RATIO, RATIO_TOLERANCE) &&
            near(l.banner.width, l.tabs.width),
        `${label} 主頁：闊版橫額喺左上（${l.banner?.left}, ${l.banner?.top}），${ratio.toFixed(2)}:1，同分類掣一樣闊（${l.banner?.width} / ${l.tabs?.width}）`,
    );
    env.log(
        l.stacked === true &&
            l.shelf !== null &&
            l.card !== null &&
            near(l.shelf.bottom, l.card.bottom),
        `${label} 主頁：一欄疊卡用盡左欄高度，底同播放卡對齊（書架底 ${l.shelf?.bottom}、播放卡底 ${l.card?.bottom}）`,
    );
    env.log(
        l.card !== null && l.card.left >= l.vw / 2 && l.card.left - l.vw / 2 < edge,
        `${label} 主頁：播放卡喺右半（左邊 ${l.card?.left}，正中 ${l.vw / 2}）`,
    );
    await ctx.close();
};

/** 冇播放卡：橫額同分類掣拉到全闊，卡改兩欄（第一行兩張並排） */
const checkFill = async (env, { label, viewport, edge }) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport }, { now: E2E_SUNDAY });
    await openHome(p, env.base);
    const l = await look(p);
    const [a, b] = l.firstTwo;
    env.log(
        l.card === null && l.banner !== null && near(l.vw - l.banner.right, edge),
        `${label} 主頁冇播放卡：橫額拉到全闊（右邊離畫面 ${l.banner ? l.vw - l.banner.right : null}）`,
    );
    env.log(
        l.stacked === false && a && b && near(a.top, b.top) && b.left > a.left,
        `${label} 主頁冇播放卡：卡改兩欄（頭兩張頂 ${a?.top} / ${b?.top}）`,
    );
    await ctx.close();
};

/** 撳第一張卡（focus 緊）入節目頁 */
const checkOpen = async (env, { label, viewport }) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport });
    await p.goto(`${env.base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    await openHome(p, env.base);
    await p
        .getByRole('navigation', { name: SHELF })
        .getByRole('button', { name: /^Bad Girl大過佬/ })
        .click();
    env.log(await reachesHash(p, OPEN_HASH), `${label} 主頁：撳疊卡入節目頁`);
    await ctx.close();
};

export const runShelfSplitChecks = async (env) => {
    for (const device of DEVICES) {
        await runSection(
            env.log,
            `${device.label} 新主頁`,
            () => checkSplit(env, device),
            env.browser,
        );
        await runSection(
            env.log,
            `${device.label} 冇播放卡`,
            () => checkFill(env, device),
            env.browser,
        );
        await runSection(
            env.log,
            `${device.label} 撳疊卡`,
            () => checkOpen(env, device),
            env.browser,
        );
    }
};
