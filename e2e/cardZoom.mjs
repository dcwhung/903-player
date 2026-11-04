// 主頁格仔 zoom 入內頁 e2e（P6 #2 Z3，_mockups_/card-zoom）：
// 撳格仔用 zoom 過場、窄版返主頁用 unzoom；過場完標記同格仔框都清走。
// 闊橫版（_mockups_/card-zoom-wide）：同卡同一個節目 → expand；卡播緊另一樣 → zoom-handle（卡 ↔ 內頁把手配對），
// 返回 unzoom-handle；冇把手而會有卡 → back；閂咗卡又冇開播 → 返回後仍然閂卡。
// 每個情境用獨立 context，唔受 run.mjs 主流程之前播過乜影響
import { newE2EPage, PHONE, reachesHash, runSection } from './harness.mjs';

// iPad 打橫：高 ≥ 562 先係闊橫版（src/config/layout.ts WIDE_BANNER_QUERY）
const WIDE = { width: 1180, height: 820 };
// 過場等幾耐先睇結果（--view-transition-move 520ms + render）
const MOTION_SETTLE_MS = 1500;
// 等轉頁最多幾耐
const ROUTE_WAIT_MS = 5000;
// 公子會：主頁第二格，直版一定喺畫面入面（src/catalog/shows 次序）
const SHOW = { name: '公子會', hash: '#/show/gongzi' };
const BACK_LABEL = '返回主頁';
const HOME_HASH = '#/';
// 闊橫版截圖尺寸：右邊卡預設顯示今日第一個節目（未載入）
const WIDE_DESK = { width: 1300, height: 800 };
const CARD_SHOW = { name: /^在晴朗的一天出發/, hash: '#/show/sunnyday' };
const SERIES = { name: /^芝See菇Bi Family/, hash: '#/drama/chisee' };
const CLOSE_CARD = '關閉播放器';
const PANEL_NAME = 'player-panel';

/**
 * 喺瀏覽器入面行（addInitScript）：記低每個 View Transition 嘅 kind、開始嗰陣有冇格仔標咗做來源，
 * 同佢有冇真係行到（ready）定係畀瀏覽器跳過（例如撞名，S-633）
 */
const installZoomProbe = () => {
    window.__e2eTransitions = [];
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    // 卡 / 主頁把手 / 內頁把手喺舊畫面（開始嗰刻）同新畫面（update 之後）嘅 view-transition-name
    const names = () =>
        Object.fromEntries(
            ['data-home-card', 'data-home-handle', 'data-page-handle'].map((attr) => {
                const el = document.querySelector(`[${attr}]`);
                return [attr, el ? getComputedStyle(el).viewTransitionName : null];
            }),
        );
    document.startViewTransition = (update) => {
        const entry = { kind: document.documentElement.dataset.viewTransition, ran: null };
        entry.before = names();
        window.__e2eTransitions.push(entry);
        const transition = start(() => {
            update();
            entry.after = names();
        });
        transition.ready.then(
            () => (entry.ran = true),
            () => (entry.ran = false),
        );
        return transition;
    };
};

const transitionsOf = (p) => p.evaluate(() => window.__e2eTransitions);

/** 過場完：冇 kind 標記、冇格仔標住做來源、html 冇殘留格仔框 */
const cleanedUp = (p) =>
    p.evaluate(
        () =>
            document.documentElement.dataset.viewTransition === undefined &&
            document.querySelector('[data-zoom-source]') === null &&
            document.documentElement.style.getPropertyValue('--zoom-inset-top') === '',
    );

const openHome = async (p, base) => {
    await p.goto(base);
    await p.locator('nav[aria-busy="false"]').waitFor();
};

const tapShowTile = (p) =>
    p.locator('nav').getByRole('button', { name: SHOW.name, exact: true }).click();

/** 撳格仔之後新開嘅過場：得一個、係 zoom、真係行到；完咗清走，到咗節目頁 */
const checkZoomIn = async (p, log, label) => {
    const before = (await transitionsOf(p)).length;
    await tapShowTile(p);
    await p.waitForURL((url) => url.hash === SHOW.hash, { timeout: ROUTE_WAIT_MS });
    await p.waitForTimeout(MOTION_SETTLE_MS);
    const runs = (await transitionsOf(p)).slice(before);
    const clean = await cleanedUp(p);
    log(
        runs.length === 1 && runs[0].kind === 'zoom' && runs[0].ran && clean,
        `${label}：撳「${SHOW.name}」格經 zoom 過場入節目頁，完咗清走標記（${JSON.stringify(runs)}，清走 ${clean}）`,
    );
};

/** 直版：撳格仔 zoom 入頁，撳返回 unzoom 縮返入嗰格 */
const checkPhone = async ({ browser, base, errors, log }) => {
    const label = '直版格仔 zoom';
    const { ctx, p } = await newE2EPage(browser, errors, { viewport: PHONE });
    await ctx.addInitScript(installZoomProbe);
    await openHome(p, base);
    await checkZoomIn(p, log, label);

    const before = (await transitionsOf(p)).length;
    await p.getByRole('button', { name: BACK_LABEL, exact: true }).click();
    await p.locator('nav[aria-busy="false"]').waitFor({ timeout: ROUTE_WAIT_MS });
    await p.waitForTimeout(MOTION_SETTLE_MS);
    const runs = (await transitionsOf(p)).slice(before);
    const clean = await cleanedUp(p);
    log(
        runs.length === 1 && runs[0].kind === 'unzoom' && runs[0].ran && clean,
        `${label}：撳返回經 unzoom 縮返入「${SHOW.name}」格，完咗清走標記（${JSON.stringify(runs)}，清走 ${clean}）`,
    );
    await ctx.close();
};

/** 闊橫版（有播放卡）：撳格仔都係 zoom，唔係播放卡同內頁嘅 expand 變形 */
const checkWide = async ({ browser, base, errors, log }) => {
    const label = '闊橫版格仔 zoom';
    const { ctx, p } = await newE2EPage(browser, errors, { viewport: WIDE });
    await ctx.addInitScript(installZoomProbe);
    await openHome(p, base);
    await checkZoomIn(p, log, label);
    await ctx.close();
};

/** 闊橫版開主頁（1300×800，右邊有卡），裝埋過場 probe */
const openWide = async ({ browser, base, errors }) => {
    const { ctx, p } = await newE2EPage(browser, errors, { viewport: WIDE_DESK });
    await ctx.addInitScript(installZoomProbe);
    await openHome(p, base);
    return { ctx, p };
};

const tileByName = (p, name) =>
    p.locator('nav').getByRole('button', { name, exact: typeof name === 'string' });

/** 做 act（撳格 / 返回），等轉到 hash，回呢段新開嘅過場 */
const transitionsAround = async (p, act, hash) => {
    const before = (await transitionsOf(p)).length;
    await act();
    const reached = await reachesHash(p, hash);
    await p.waitForTimeout(MOTION_SETTLE_MS);
    return { reached, runs: (await transitionsOf(p)).slice(before), clean: await cleanedUp(p) };
};

const goBack = (p) => p.getByRole('button', { name: BACK_LABEL, exact: true }).click();

/** 得一個過場、係 kind、真係行到、完咗清走 */
const single = ({ reached, runs, clean }, kind) =>
    reached && runs.length === 1 && runs[0].kind === kind && runs[0].ran && clean;

const named = (names, attr) => names?.[attr] === PANEL_NAME;

/** 同卡同一個節目：同 ⤢ 一樣 expand，返回 back */
const checkWideSameShow = async (env) => {
    const label = '闊橫版同卡同節目';
    const { ctx, p } = await openWide(env);
    const into = await transitionsAround(
        p,
        () => tileByName(p, CARD_SHOW.name).click(),
        CARD_SHOW.hash,
    );
    env.log(
        single(into, 'expand'),
        `${label}：撳「${CARD_SHOW.name}」格用 expand（${JSON.stringify(into)}）`,
    );
    const back = await transitionsAround(p, () => goBack(p), HOME_HASH);
    env.log(single(back, 'back'), `${label}：返回用 back（${JSON.stringify(back)}）`);
    await ctx.close();
};

/** ①：卡播緊 A，撳 B → zoom-handle（卡 → 內頁把手），返回 unzoom-handle（把手 → 卡），卡返嚟 */
const checkWideBusyCard = async (env) => {
    const label = '闊橫版播緊卡撳另一格';
    const { ctx, p } = await openWide(env);
    await p.locator('[data-home-card]').getByRole('button', { name: '播放', exact: true }).click();
    const into = await transitionsAround(p, () => tileByName(p, SHOW.name).click(), SHOW.hash);
    const paired =
        named(into.runs[0]?.before, 'data-home-card') &&
        named(into.runs[0]?.after, 'data-page-handle');
    env.log(
        single(into, 'zoom-handle') && paired,
        `${label}：入頁 zoom-handle，卡同內頁把手配對（${JSON.stringify(into)}）`,
    );
    const back = await transitionsAround(p, () => goBack(p), HOME_HASH);
    const reversed =
        named(back.runs[0]?.before, 'data-page-handle') &&
        named(back.runs[0]?.after, 'data-home-card');
    const card = await p.locator('[data-home-card]').count();
    env.log(
        single(back, 'unzoom-handle') && reversed && card === 1,
        `${label}：返回 unzoom-handle，把手放大返做卡（${JSON.stringify(back)}，卡 ${card}）`,
    );
    await ctx.close();
};

/** ②：卡未播（撳格會開播 B，內頁冇把手）→ zoom；返回會有 B 嘅卡 → back（R2） */
const checkWideNoHandle = async (env) => {
    const label = '闊橫版撳格開播';
    const { ctx, p } = await openWide(env);
    const into = await transitionsAround(p, () => tileByName(p, SHOW.name).click(), SHOW.hash);
    env.log(single(into, 'zoom'), `${label}：入頁 zoom（${JSON.stringify(into)}）`);
    const back = await transitionsAround(p, () => goBack(p), HOME_HASH);
    env.log(single(back, 'back'), `${label}：返回 back，內頁縮做卡（${JSON.stringify(back)}）`);
    await ctx.close();
};

/** ③：⏻ 閂咗卡，撳唔會開播嘅短篇劇集格 → 主頁把手 ↔ 內頁把手配對；返回後仍然閂卡（主頁把手喺度） */
const checkWideClosedCard = async (env) => {
    const label = '闊橫版閂卡撳格';
    const { ctx, p } = await openWide(env);
    await p.getByRole('button', { name: CLOSE_CARD, exact: true }).click();
    await p.locator('[data-home-handle]').waitFor();
    await p.getByRole('button', { name: '廣播劇', exact: true }).click();
    await p.waitForTimeout(MOTION_SETTLE_MS);
    const into = await transitionsAround(
        p,
        () => tileByName(p, SERIES.name).first().click(),
        SERIES.hash,
    );
    const paired =
        named(into.runs[0]?.before, 'data-home-handle') &&
        named(into.runs[0]?.after, 'data-page-handle');
    env.log(
        single(into, 'zoom-handle') && paired,
        `${label}：入頁 zoom-handle，主頁把手同內頁把手配對（${JSON.stringify(into)}）`,
    );
    const back = await transitionsAround(p, () => goBack(p), HOME_HASH);
    const handle = await p.locator('[data-home-handle]').count();
    const card = await p.locator('[data-home-card]').count();
    env.log(
        single(back, 'unzoom-handle') && handle === 1 && card === 0,
        `${label}：返回 unzoom-handle，仍然閂卡（${JSON.stringify(back)}，把手 ${handle}，卡 ${card}）`,
    );
    await ctx.close();
};

const SCENARIOS = [
    ['直版格仔 zoom', checkPhone],
    ['闊橫版格仔 zoom', checkWide],
    ['闊橫版同卡同節目', checkWideSameShow],
    ['闊橫版播緊卡撳另一格', checkWideBusyCard],
    ['闊橫版撳格開播', checkWideNoHandle],
    ['闊橫版閂卡撳格', checkWideClosedCard],
];

/** 主頁格仔 zoom：每個情境各自一個 section，一個 throw 唔會跳過其他 */
export const runCardZoomChecks = async (env) => {
    for (const [label, check] of SCENARIOS) {
        await runSection(env.log, label, () => check(env), env.browser);
    }
};
