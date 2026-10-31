// 闊橫版主頁 e2e（v1.21.x，CUI-0015）：iPad 打橫（1180×820）主頁按 main[data-layout] 分流。
// fill = 冇 mini player 全闊填滿格；split = 左格 + 右邊播放卡；fillWithHandle = ✕ 閂咗卡、右邊把手。
// 每個情境用獨立 context，唔受 run.mjs 主流程之前播過乜影響
import { ensurePlaying, isShown, newE2EPage, waitForPlaybackState } from './harness.mjs';

// iPad 打橫：高 ≥ 562 先係闊橫版（src/config/layout.ts WIDE_BANNER_QUERY）
const WIDE = { width: 1180, height: 820 };
// 星期日：假錄音（sampleData.mjs）冇節目，主頁冇 mini player（同 miniPlayerRules.mjs 一樣）
const E2E_SUNDAY = '2026-10-18T22:30:00+08:00';
// 播放卡佔 main 內容闊（tokens.css --home-pane-ratio）；刻意寫死做獨立對照
const PANE_RATIO = 0.36;
// 闊度比例容差：subpixel 捨入
const PANE_RATIO_TOLERANCE = 0.01;
// 等版面轉模式（View Transition 過場 + React render）最多幾耐
const LAYOUT_WAIT_MS = 5000;
// 把手開返張卡之後等幾耐：會自動播嘅話呢段時間內已經播咗
const NO_AUTOPLAY_WAIT_MS = 1500;
// 把手喺右邊緣：右邊最多留幾多 px（安全區 + 預留位）
const HANDLE_EDGE_PX = 40;
// 清單捲落去幾多 px：夠證明清單自己捲
const LIST_SCROLL_PX = 200;

const ANY_MINI_REGION = /^正在播放/;
// 平日冇嘢載入：張卡係今日節目（同直版 mini player 一樣）
const TODAY_REGION = '正在播放（今日節目）';
const CLOSE_LABEL = '關閉播放器';
// 公子會（星期六）最近一集 17/10：入節目頁自動播，返主頁就係重溫
const REWATCH_SHOW = { name: '公子會', route: '#/show/gongzi' };
const REOPEN_LABEL = `打開播放器：${REWATCH_SHOW.name}`;
const LIST_COUNT = /^共 \d+ 集/;

const card = (p) => p.locator('section[data-home-card]');

const openWideHome = async (p, base) => {
    await p.goto(base);
    await p.locator('nav[aria-busy="false"]').waitFor();
};

const hasLayout = (p, mode) =>
    isShown(p.locator(`main[data-layout="${mode}"]`), { timeout: LAYOUT_WAIT_MS });

const layoutOf = (p) => p.locator('main').first().getAttribute('data-layout');

/** 量 main 內容闊、卡欄、節目格、把手嘅位置（冇嗰樣就 null） */
const measure = (p) =>
    p.evaluate(() => {
        const box = (el) => {
            if (!el) return null;
            const { left, right, width } = el.getBoundingClientRect();
            return { left, right, width };
        };
        const main = document.querySelector('main');
        const style = getComputedStyle(main);
        const content =
            main.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        return {
            content,
            column: box(document.querySelector('[data-home-card]')?.closest('main > *')),
            nav: box(document.querySelector('nav')),
            handle: box(document.querySelector('[data-home-handle]')),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
    });

/** 星期日冇嘢載入：全闊填滿格，冇播放卡、冇把手、冇 mini player */
const checkFill = async ({ browser, base, errors, log }) => {
    const label = '闊橫版主頁（冇 mini player）';
    const { ctx, p } = await newE2EPage(browser, errors, { viewport: WIDE }, { now: E2E_SUNDAY });
    await openWideHome(p, base);
    log(await hasLayout(p, 'fill'), `${label}：版面係 fill（${await layoutOf(p)}）`);
    const cards = await card(p).count();
    const minis = await p.getByRole('region', { name: ANY_MINI_REGION }).count();
    const handles = await p.locator('[data-home-handle]').count();
    log(
        cards === 0 && minis === 0 && handles === 0,
        `${label}：冇播放卡、mini player、把手（卡 ${cards}、mini ${minis}、把手 ${handles}）`,
    );
    await ctx.close();
};

/** 卡入面嘅集數清單：同內頁一樣「集數 · 共 N 集」，清單自己捲、成頁唔郁 */
const checkCardEpisodes = async (p, log, label) => {
    const list = card(p).getByRole('region', { name: '集數' });
    const count = (await list.locator('h2 + span').textContent()) ?? '';
    log(
        (await list.count()) === 1 && LIST_COUNT.test(count),
        `${label}：卡入面有集數清單（集數 · ${count}）`,
    );
    const scroll = await list.locator('ul').evaluate((ul, px) => {
        ul.scrollTop = px;
        return { list: ul.scrollTop, page: document.scrollingElement.scrollTop };
    }, LIST_SCROLL_PX);
    log(
        scroll.list > 0 && scroll.page === 0,
        `${label}：清單喺卡入面自己捲，成頁唔郁（清單 ${scroll.list}px、頁 ${scroll.page}px）`,
    );
};

/** 平日冇嘢載入：右邊今日節目播放卡，佔 36% 闊，節目格喺卡左邊 */
const checkSplit = async ({ browser, base, errors, log }) => {
    const label = '闊橫版主頁（有 mini player）';
    const { ctx, p } = await newE2EPage(browser, errors, { viewport: WIDE });
    await openWideHome(p, base);
    log(await hasLayout(p, 'split'), `${label}：版面係 split（${await layoutOf(p)}）`);
    const regions = await p.getByRole('region', { name: ANY_MINI_REGION }).count();
    const todayCard = card(p).and(p.getByRole('region', { name: TODAY_REGION, exact: true }));
    log(
        regions === 1 && (await todayCard.count()) === 1,
        `${label}：只得右邊一張播放卡（${TODAY_REGION}），底部冇 mini player（${regions} 個）`,
    );
    const m = await measure(p);
    const ratio = m.column ? m.column.width / m.content : 0;
    log(
        Math.abs(ratio - PANE_RATIO) <= PANE_RATIO_TOLERANCE,
        `${label}：卡欄佔 ${(ratio * 100).toFixed(1)}% 闊（預期 ${PANE_RATIO * 100}%）`,
    );
    log(
        m.column !== null && m.nav.right <= m.column.left && m.overflow === 0,
        `${label}：節目格喺卡左邊、冇橫向捲動（格右 ${m.nav.right}、卡左 ${m.column?.left}）`,
    );
    await checkCardEpisodes(p, log, label);
    await ctx.close();
};

/** 播緊公子會返主頁 → ✕ 停播、卡縮入右邊把手 → 撳把手開返（暫停、唔自動播） */
const checkCloseAndReopen = async ({ browser, base, errors, log }) => {
    const label = '闊橫版主頁播放卡';
    const { ctx, p } = await newE2EPage(browser, errors, { viewport: WIDE });
    await p.goto(`${base}${REWATCH_SHOW.route}`);
    await ensurePlaying(p);
    await p.getByRole('button', { name: '返回主頁' }).click();
    const split = await hasLayout(p, 'split');
    const before = await measure(p);
    log(split && before.column !== null, `${label}：播緊${REWATCH_SHOW.name}返主頁出右邊播放卡`);
    if (!split) return ctx.close();

    await card(p).locator('..').getByRole('button', { name: CLOSE_LABEL }).click();
    const closed = await hasLayout(p, 'fillWithHandle');
    const stopped = await waitForPlaybackState(p, 'paused');
    log(
        closed && stopped !== 'playing',
        `${label}：撳 ✕ 停播、版面轉 fillWithHandle（${await layoutOf(p)}，${stopped}）`,
    );
    const handle = p.getByRole('button', { name: REOPEN_LABEL, exact: true });
    const after = await measure(p);
    log(
        (await card(p).count()) === 0 &&
            (await handle.count()) === 1 &&
            after.handle !== null &&
            WIDE.width - after.handle.right <= HANDLE_EDGE_PX,
        `${label}：張卡收埋，右邊緣出把手「${REOPEN_LABEL}」（把手右 ${after.handle?.right}）`,
    );
    log(
        after.nav.width > before.nav.width &&
            after.handle !== null &&
            after.nav.right <= after.handle.left,
        `${label}：閂卡後節目格變闊（${before.nav.width} → ${after.nav.width}px），唔遮把手`,
    );

    await handle.click();
    const reopened = await hasLayout(p, 'split');
    const header = await card(p).getByRole('button').first().getAttribute('aria-label');
    log(
        reopened && (header ?? '').includes(REWATCH_SHOW.name),
        `${label}：撳把手開返張卡，係閂咗嗰個節目（${await layoutOf(p)}，${header}）`,
    );
    await p.waitForTimeout(NO_AUTOPLAY_WAIT_MS);
    const state = await p.evaluate(() => navigator.mediaSession.playbackState);
    log(state !== 'playing', `${label}：開返張卡停喺暫停，唔自動播（${state}）`);
    await ctx.close();
};

/** 闊橫版主頁：fill / split（卡闊、卡清單）/ ✕ 閂卡 → 把手 → 開返 */
export const runHomeWideChecks = async (env) => {
    await checkFill(env);
    await checkSplit(env);
    await checkCloseAndReopen(env);
};
