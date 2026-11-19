// 新主頁 e2e（P10 lane 3，_mockups_/iphone-duo 打開・橫、_mockups_/home-view 主頁）：
// 左欄頂固定闊版橫額 + 分類掣 + 疊卡 scroller，右欄播放卡（左右各半，Duo 對齊摺位）；
// 冇播放卡 / 閂咗卡（兩欄或以上）用返原本闊橫版填滿格：橫額做第一格、一版放晒唔捲（用戶 2026-11-18）。Duo 打開・橫（876×612）同 HomeView（544×544）同一套。
// 現有裝置唔受影響由 `npm run e2e:visual` 驗。每個情境用獨立 context
import { goBack, installZoomProbe, single, transitionsAround } from './cardZoom.mjs';
import { BANNER_ALT, ensurePlaying, newE2EPage, reachesHash, runSection } from './harness.mjs';

/** 刻意寫死做獨立對照（Progressier simulator 實測 / HomeView 假設） */
const DEVICES = [
    // Duo：--home-gutter 16 + 邊框 8；摺位喺正中
    // pageHandles：內頁有冇右邊把手（只係闊橫版；HomeView 唔係橫向）
    { label: 'Duo 打開・橫', viewport: { width: 876, height: 612 }, edge: 24, pageHandles: true },
    { label: 'HomeView', viewport: { width: 544, height: 544 }, edge: 16, pageHandles: false },
];
// 闊版橫額（banner-wide 5:1）
const BANNER_RATIO = 5;
const RATIO_TOLERANCE = 0.05;
const EDGE_TOLERANCE_PX = 1;
const SHOW_ROUTE = '#/show/gongzi';
const OPEN_HASH = '#/show/badgirl';
// 疊卡第一張（節目次序第一個）
const FIRST_CARD = /^Bad Girl大過佬/;
const SHELF = '節目';
const HOME_HASH = '#/';
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
            const tiles = [...(shelf?.querySelectorAll('button') ?? [])].map((el) =>
                el.getBoundingClientRect(),
            );
            const card = box(document.querySelector('section[data-home-card]'));
            // 分類掣（左欄嘅直屬子元素）同左欄其他子元素嘅過場名（W-791）
            const column = document.querySelector('[data-tab-id]')?.closest('main > div');
            const names = [...(column?.children ?? [])].map((el) => ({
                tabs: el.contains(document.querySelector('[data-tab-id]')),
                name: getComputedStyle(el).viewTransitionName,
            }));
            return {
                tabsNamed:
                    names.filter((n) => n.name === 'home-tabs').length === 1 &&
                    names.find((n) => n.tabs)?.name === 'home-tabs',
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
    env.log(l.tabsNamed, `${label} 主頁有播放卡：分類掣先係 home-tabs 過場名（W-791）`);
    env.log(
        l.card !== null && l.card.left >= l.vw / 2 && l.card.left - l.vw / 2 < edge,
        `${label} 主頁：播放卡喺右半（左邊 ${l.card?.left}，正中 ${l.vw / 2}）`,
    );
    await ctx.close();
};

/** 冇播放卡：原本填滿格，橫額係格入面第一格，唔疊、唔捲 */
const checkFill = async (env, { label, viewport }) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport }, { now: E2E_SUNDAY });
    await openHome(p, env.base);
    const l = await look(p);
    const [a, b] = l.firstTwo;
    const fill = await p.evaluate(() => {
        const main = document.querySelector('main');
        const nav = main.querySelector('nav');
        return {
            layout: main.dataset.layout,
            bannerInGrid: nav.contains(document.querySelector('h1')),
            scrolls: nav.scrollHeight > nav.clientHeight + 1,
        };
    });
    env.log(
        l.card === null && fill.layout === 'fill' && fill.bannerInGrid && !fill.scrolls,
        `${label} 主頁冇播放卡：原本填滿格，橫額喺格入面、唔捲（${JSON.stringify(fill)}）`,
    );
    env.log(l.tabsNamed, `${label} 主頁冇播放卡：分類掣先係 home-tabs 過場名（W-791）`);
    env.log(
        l.stacked === false && a && b && near(a.top, b.top) && b.left > a.left,
        `${label} 主頁冇播放卡：格仔並排、唔疊（頭兩格頂 ${a?.top} / ${b?.top}）`,
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

/**
 * 播緊 route 嘅節目返主頁，主頁有播放卡；記低之後嘅過場。
 * 保持播緊：撳其他節目先唔會順便開始播佢（useShowOpeners），內頁先有把手
 */
const splitHomeWithProbe = async (env, viewport, route) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport });
    await ctx.addInitScript(installZoomProbe);
    await p.goto(`${env.base}${route}`);
    await ensurePlaying(p);
    // 用 app 嘅返回掣（goto 會重新載入成頁，播放停咗）
    await goBack(p);
    await p.locator('nav[aria-busy="false"]').waitFor({ timeout: WAIT_MS });
    return { ctx, p };
};

const shelfCard = (p, name) =>
    p.getByRole('navigation', { name: SHELF }).getByRole('button', { name });

/**
 * 第一張（Bad Girl）返主頁時係 focus 緊，撳一下就入頁。HomeView 返主頁播放卡收埋（填滿格，冇疊卡），
 * 等格仔出現就得
 */
const firstCardReady = (p, pageHandles) =>
    pageHandles ? firstCardFocused(p) : shelfCard(p, FIRST_CARD).waitFor({ timeout: WAIT_MS });

const firstCardFocused = (p) =>
    p
        .getByRole('navigation', { name: SHELF })
        .locator('[data-focused]')
        .getByRole('button', { name: FIRST_CARD })
        .waitFor({ timeout: WAIT_MS });

/**
 * 疊卡入頁 / 返主頁嘅過場（W-787 / W-790）：Duo 打開・橫內頁有把手，同闊橫版一樣
 * （其他節目 zoom-handle / unzoom-handle；張卡嘅節目 expand / back）；
 * HomeView 內頁係窄版冇把手，一律 zoom / unzoom
 */
const checkZoom = async (env, { label, viewport, pageHandles }) => {
    // 播緊公子會，撳 Bad Girl（其他節目）
    const other = await splitHomeWithProbe(env, viewport, SHOW_ROUTE);
    await firstCardReady(other.p, pageHandles);
    const into = await transitionsAround(
        other.p,
        () => shelfCard(other.p, FIRST_CARD).click(),
        OPEN_HASH,
    );
    const back = await transitionsAround(other.p, () => goBack(other.p), HOME_HASH);
    const [inKind, backKind] = pageHandles ? ['zoom-handle', 'unzoom-handle'] : ['zoom', 'unzoom'];
    env.log(
        single(into, inKind) && single(back, backKind),
        `${label} 疊卡入其他節目：${inKind} / ${backKind}（${JSON.stringify({ into, back })}）`,
    );
    await other.ctx.close();

    // 播緊 Bad Girl，撳返佢自己張卡
    const own = await splitHomeWithProbe(env, viewport, OPEN_HASH);
    await firstCardReady(own.p, pageHandles);
    const ownInto = await transitionsAround(
        own.p,
        () => shelfCard(own.p, FIRST_CARD).click(),
        OPEN_HASH,
    );
    const ownBack = await transitionsAround(own.p, () => goBack(own.p), HOME_HASH);
    const [ownIn, ownOut] = pageHandles ? ['expand', 'back'] : ['zoom', 'unzoom'];
    env.log(
        single(ownInto, ownIn) && single(ownBack, ownOut),
        `${label} 疊卡入播緊嘅節目：${ownIn} / ${ownOut}（${JSON.stringify({ ownInto, ownBack })}）`,
    );
    await own.ctx.close();
};

/**
 * 播緊嘢由內頁撳返回（P10 v2.0.1 用戶反饋截圖 25 → 26）：HomeView 直接返主頁選單（全闊填滿格），
 * 播放卡收埋、右邊把手（播放中，冇停播），撳把手先出返張卡；Duo 打開・橫照舊出張卡。
 * 減少動態都一樣（冇過場，直接切換）
 */
const checkReturnFolded = async (env, { label, viewport, pageHandles }, reducedMotion) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport, reducedMotion });
    await p.goto(`${env.base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    await goBack(p);
    await p.locator('nav[aria-busy="false"]').waitFor({ timeout: WAIT_MS });
    const look = () =>
        p.evaluate(() => {
            const handle = document.querySelector('[data-home-handle]');
            return {
                layout: document.querySelector('main')?.dataset.layout ?? null,
                card: document.querySelector('section[data-home-card]') !== null,
                handle: handle?.getAttribute('aria-label') ?? null,
                playing: navigator.mediaSession.playbackState === 'playing',
            };
        });
    const back = await look();
    const motion = reducedMotion === 'reduce' ? '（減少動態）' : '';
    if (pageHandles) {
        env.log(
            back.layout === 'split' && back.card,
            `${label} 播緊返主頁：照舊出播放卡${motion}（${JSON.stringify(back)}）`,
        );
        await ctx.close();
        return;
    }
    env.log(
        back.layout === 'fillWithHandle' &&
            !back.card &&
            back.handle?.startsWith('播放中：') === true &&
            back.playing,
        `${label} 播緊返主頁：主頁選單 + 把手，播放卡收埋、照播${motion}（${JSON.stringify(back)}）`,
    );
    await p.locator('[data-home-handle]').click();
    await p.locator('section[data-home-card]').waitFor({ timeout: WAIT_MS });
    const opened = await look();
    env.log(
        opened.layout === 'split' && opened.card && opened.handle === null,
        `${label} 撳把手出返播放卡${motion}（${JSON.stringify(opened)}）`,
    );
    await ctx.close();
};

const SCENARIOS = [
    ['新主頁', checkSplit],
    ['播緊返主頁', (env, device) => checkReturnFolded(env, device)],
    ['播緊返主頁（減少動態）', (env, device) => checkReturnFolded(env, device, 'reduce')],
    ['冇播放卡', checkFill],
    ['撳疊卡', checkOpen],
    ['疊卡過場', checkZoom],
];

export const runShelfSplitChecks = async (env) => {
    for (const device of DEVICES) {
        for (const [name, check] of SCENARIOS) {
            await runSection(
                env.log,
                `${device.label} ${name}`,
                () => check(env, device),
                env.browser,
            );
        }
    }
};
