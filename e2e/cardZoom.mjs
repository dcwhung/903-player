// 主頁格仔 zoom 入內頁 e2e（P6 #2 Z3，_mockups_/card-zoom）：
// 撳格仔用 zoom 過場（闊橫版都係，唔係播放卡嘅 expand）、窄版返主頁用 unzoom；過場完標記同格仔框都清走。
// 每個情境用獨立 context，唔受 run.mjs 主流程之前播過乜影響
import { newE2EPage, PHONE, runSection } from './harness.mjs';

// iPad 打橫：高 ≥ 562 先係闊橫版（src/config/layout.ts WIDE_BANNER_QUERY）
const WIDE = { width: 1180, height: 820 };
// 過場等幾耐先睇結果（--view-transition-move 520ms + render）
const MOTION_SETTLE_MS = 1500;
// 等轉頁最多幾耐
const ROUTE_WAIT_MS = 5000;
// 公子會：主頁第二格，直版一定喺畫面入面（src/catalog/shows 次序）
const SHOW = { name: '公子會', hash: '#/show/gongzi' };
const BACK_LABEL = '返回主頁';

/**
 * 喺瀏覽器入面行（addInitScript）：記低每個 View Transition 嘅 kind、開始嗰陣有冇格仔標咗做來源，
 * 同佢有冇真係行到（ready）定係畀瀏覽器跳過（例如撞名，S-633）
 */
const installZoomProbe = () => {
    window.__e2eTransitions = [];
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    document.startViewTransition = (update) => {
        const entry = { kind: document.documentElement.dataset.viewTransition, ran: null };
        window.__e2eTransitions.push(entry);
        const transition = start(update);
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

const SCENARIOS = [
    ['直版格仔 zoom', checkPhone],
    ['闊橫版格仔 zoom', checkWide],
];

/** 主頁格仔 zoom：每個情境各自一個 section，一個 throw 唔會跳過其他 */
export const runCardZoomChecks = async (env) => {
    for (const [label, check] of SCENARIOS) {
        await runSection(env.log, label, () => check(env), env.browser);
    }
};
