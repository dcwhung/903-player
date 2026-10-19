// 觸控 e2e：Chromium 手機模擬（hasTouch + isMobile）+ CDP Input.dispatchTouchEvent。
// page.touchscreen 只識 tap，拖動要自己逐格發 touchMove。
// 模擬唔到 iOS 橡筋同 standalone 嘅 viewport 怪癖，所以另外斷言根元素嘅 CSS 鎖。

const TOUCH_VIEWPORTS = [
    // iPhone 14/15（有 Dynamic Island：頂 47–59px、底 34px 安全區）同 iPhone SE（Home 掣）
    { width: 390, height: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 } },
    { width: 375, height: 667, insets: { top: 20, bottom: 0, left: 0, right: 0 } },
];
// 橫向手機：成頁捲斷點（Page.module.css max-height: 561px）以下，改由 main 自己捲
const LANDSCAPE = { width: 844, height: 390, insets: { top: 0, bottom: 21, left: 47, right: 47 } };

const STEPS = 10;
const STEP_MS = 16;
const SETTLE_MS = 700;
const VERTICAL_DRAG_PX = 260;
const CARD_SWIPE_PX = 160;
const CARD_JITTER_PX = 20;
const STRIP_SWIPE_PX = 140;
const MINI_SWIPE_PX = 160;
// 拖卡途中播放進度最多可以自然行咁多秒（唔可以係 seek）
const SEEK_TOLERANCE_S = 3;
const TODAY_STACK = '今日節目，左右掃動轉節目';
const STRIP = '[aria-roledescription="轉集"]';
const MINI_REGION = '正在播放（今日節目）';

/** 開一個 iPhone 似嘅觸控 context；支援就順便模擬安全區（env(safe-area-inset-*)） */
const openTouchPage = async (browser, serveAudio, errors, { width, height, insets }) => {
    const ctx = await browser.newContext({
        viewport: { width, height },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 3,
        colorScheme: 'dark',
    });
    await ctx.route('https://audio.hkfm903.live/**', serveAudio);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    const cdp = await ctx.newCDPSession(p);
    const safeArea = await cdp
        .send('Emulation.setSafeAreaInsetsOverride', { insets })
        .then(() => true)
        .catch(() => false);
    return { ctx, p, cdp, safeArea };
};

/**
 * 一隻手指由 (x, y) 拖 (dx, dy)，分 STEPS 格；jitter 令中途上下抖（模擬真手指唔會拉直線）。
 * release: false 就唔放手（返回一個 function 之後先放）
 */
const touchDrag = async (cdp, p, { x, y }, { dx, dy }, { jitter = 0, release = true } = {}) => {
    const send = (type, points) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    await send('touchStart', [{ x, y }]);
    for (let i = 1; i <= STEPS; i += 1) {
        const wobble = i < STEPS ? (i % 2 === 0 ? jitter : -jitter) / 4 : 0;
        await send('touchMove', [{ x: x + (dx * i) / STEPS, y: y + (dy * i) / STEPS + wobble }]);
        await p.waitForTimeout(STEP_MS);
    }
    const end = async () => {
        await send('touchEnd', []);
        await p.waitForTimeout(SETTLE_MS);
    };
    if (!release) return end;
    await end();
    return null;
};

const centreOf = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const docScroll = (p) =>
    p.evaluate(() => ({
        scrollTop: document.scrollingElement.scrollTop,
        scrollY: window.scrollY,
        overflow: document.documentElement.scrollHeight - window.innerHeight,
    }));

const isDocLocked = (s) => s.scrollTop === 0 && s.scrollY === 0 && s.overflow <= 0;

/** 根元素（html / body / #root）係唔捲、唔橡筋嘅固定殼（iOS 橡筋 Chromium 模擬唔到，直接睇 CSS） */
const checkRootLocked = async (p, log, label) => {
    const roots = await p.evaluate(() =>
        [document.documentElement, document.body, document.getElementById('root')].map((el) => {
            const s = getComputedStyle(el);
            return `${s.overflowY}/${s.overscrollBehaviorY}/${el.getBoundingClientRect().height}`;
        }),
    );
    const height = await p.evaluate(() => window.innerHeight);
    log(
        roots.every((r) => r === `hidden/none/${height}`),
        `${label}：html / body / #root 鎖死（${roots.join(' · ')}，畫面高 ${height}）`,
    );
};

/** 喺每個起點上下拖：成份文件都唔可以郁 */
const checkVerticalDragsLocked = async (cdp, p, log, label, targets) => {
    for (const [name, locator] of targets) {
        const start = centreOf(await locator.boundingBox());
        await touchDrag(cdp, p, start, { dx: 0, dy: -VERTICAL_DRAG_PX });
        const up = await docScroll(p);
        await touchDrag(cdp, p, start, { dx: 0, dy: VERTICAL_DRAG_PX / 2 });
        const down = await docScroll(p);
        log(
            isDocLocked(up) && isDocLocked(down),
            `${label}：喺${name}上下拖，成頁唔捲（${JSON.stringify(up)}）`,
        );
    }
};

/** 喺清單入面直向拖：清單自己捲，成頁唔郁 */
const checkListTouchScroll = async (cdp, p, log, label, list) => {
    const extra = await list.evaluate((el) => el.scrollHeight - el.clientHeight);
    const start = centreOf(await list.boundingBox());
    await touchDrag(cdp, p, start, { dx: 0, dy: -Math.min(VERTICAL_DRAG_PX, start.y / 2) });
    const scrolled = await list.evaluate((el) => el.scrollTop);
    const doc = await docScroll(p);
    log(
        (extra <= 1 || scrolled > 0) && isDocLocked(doc),
        `${label}：手指捲清單（多出 ${extra}px，scrollTop ${scrolled}，成頁 ${JSON.stringify(doc)}）`,
    );
};

const heading = (p) => p.getByRole('heading', { level: 1 }).textContent();

/** 今日節目卡：橫拖（帶直向抖動）轉節目；向左 = 下一個，向右 = 上一個 */
const checkCardSwipes = async (cdp, p, log, label) => {
    const start = centreOf(await p.getByRole('heading', { level: 1 }).boundingBox());
    const first = await heading(p);
    await touchDrag(
        cdp,
        p,
        { x: start.x + CARD_SWIPE_PX / 2, y: start.y },
        { dx: -CARD_SWIPE_PX, dy: CARD_JITTER_PX },
        { jitter: CARD_JITTER_PX },
    );
    const next = await heading(p);
    log(
        next !== first,
        `${label}：手指向左掃卡（dy +${CARD_JITTER_PX}）轉下一個：${first} → ${next}`,
    );
    await touchDrag(
        cdp,
        p,
        { x: start.x - CARD_SWIPE_PX / 2, y: start.y },
        { dx: CARD_SWIPE_PX, dy: -CARD_JITTER_PX },
        { jitter: CARD_JITTER_PX },
    );
    const back = await heading(p);
    log(
        back === first && back !== next,
        `${label}：手指向右掃卡（dy −${CARD_JITTER_PX}）返上一個：${next} → ${back}`,
    );
    log(isDocLocked(await docScroll(p)), `${label}：掃卡之後成頁仍然唔捲`);
};

/** 由唱片中間拖卡：卡跟手指，但進度唔會 seek */
const checkCardDragNeverSeeks = async (cdp, p, log, label) => {
    const slider = p.getByRole('slider', { name: '播放進度' });
    const before = Number(await slider.getAttribute('aria-valuenow'));
    const disc = centreOf(await slider.boundingBox());
    const end = await touchDrag(cdp, p, disc, { dx: -60, dy: 6 }, { release: false });
    const phase = await p.getByRole('group', { name: TODAY_STACK }).getAttribute('data-phase');
    const during = Number(await slider.getAttribute('aria-valuenow'));
    await end();
    log(
        phase === 'dragging' && Math.abs(during - before) <= SEEK_TOLERANCE_S,
        `${label}：由唱片拖卡會拖卡唔會 seek（${phase}，${before}s → ${during}s）`,
    );
};

/** 喺弧形進度條上橫拖：seek 或者乜都唔做，但唔可以轉節目 */
const checkRingDragNeverSwitches = async (cdp, p, log, label) => {
    const box = await p.getByRole('slider', { name: '播放進度' }).boundingBox();
    const before = await heading(p);
    // 弧形左邊（viewBox 300 入面約 (20, 150)），唱片外面
    const start = { x: box.x + (20 / 300) * box.width, y: box.y + box.height / 2 };
    await touchDrag(cdp, p, start, { dx: CARD_SWIPE_PX, dy: -CARD_JITTER_PX });
    const after = await heading(p);
    const phase = await p.getByRole('group', { name: TODAY_STACK }).getAttribute('data-phase');
    log(
        after === before && phase === null,
        `${label}：喺弧形進度條橫拖唔會轉節目（${before} → ${after}）`,
    );
};

/** 節目頁日子條：手指向左掃轉舊一集 */
const checkStripSwipe = async (cdp, p, log, label) => {
    const current = () =>
        p.locator('button[aria-current="true"]').first().getAttribute('aria-label');
    const before = await current();
    const start = centreOf(await p.locator(STRIP).boundingBox());
    await touchDrag(
        cdp,
        p,
        { x: start.x + STRIP_SWIPE_PX / 2, y: start.y },
        { dx: -STRIP_SWIPE_PX, dy: CARD_JITTER_PX / 2 },
        { jitter: CARD_JITTER_PX / 2 },
    );
    const after = await current();
    log(after !== before, `${label}：手指掃日子條轉集：${before} → ${after}`);
};

/** 主頁 mini player：手指向左掃轉下一個節目，仲喺主頁 */
const checkMiniSwipe = async (cdp, p, log, label) => {
    const region = p.getByRole('region', { name: MINI_REGION });
    const currentDot = () =>
        region.locator('[data-page-dot][aria-current="true"]').getAttribute('aria-label');
    const before = await currentDot();
    const start = centreOf(await region.boundingBox());
    await touchDrag(
        cdp,
        p,
        { x: start.x + MINI_SWIPE_PX / 2, y: start.y },
        { dx: -MINI_SWIPE_PX, dy: CARD_JITTER_PX / 2 },
        { jitter: CARD_JITTER_PX / 2 },
    );
    const after = await currentDot();
    log(
        after !== before && !p.url().includes('#/show'),
        `${label}：手指掃 mini player 轉節目：${before} → ${after}`,
    );
};

const waitPlaying = (p) => p.getByRole('button', { name: '暫停' }).waitFor({ timeout: 5000 });

const checkHome = async (env, label) => {
    const { p, cdp, log } = env;
    await p.goto(env.base);
    await p.waitForSelector('nav[aria-busy="false"]');
    await p.getByRole('region', { name: MINI_REGION }).waitFor();
    await checkRootLocked(p, log, label);
    log(isDocLocked(await docScroll(p)), `${label}：文件高 ≤ 畫面高`);
    await checkVerticalDragsLocked(cdp, p, log, label, [
        ['橫額', p.getByRole('heading', { level: 1 })],
        ['節目格', p.locator('nav button').nth(2)],
        ['mini player', p.getByRole('region', { name: MINI_REGION })],
    ]);
    await checkMiniSwipe(cdp, p, log, label);
};

const checkShow = async (env, label) => {
    const { p, cdp, log } = env;
    await p.goto(`${env.base}#/show/badgirl`);
    await waitPlaying(p);
    await p.waitForTimeout(500);
    await checkRootLocked(p, log, label);
    await checkVerticalDragsLocked(cdp, p, log, label, [
        ['頁頭', p.locator('header')],
        ['唱片', p.getByRole('slider', { name: '播放進度' })],
        ['日子條', p.locator(STRIP)],
    ]);
    await checkListTouchScroll(
        cdp,
        p,
        log,
        label,
        p.getByRole('region', { name: '集數' }).getByRole('list'),
    );
    await checkStripSwipe(cdp, p, log, label);
};

const checkToday = async (env, label) => {
    const { p, cdp, log } = env;
    await p.goto(`${env.base}#/today`);
    await waitPlaying(p);
    await p.waitForTimeout(500);
    await checkRootLocked(p, log, label);
    await checkVerticalDragsLocked(cdp, p, log, label, [
        ['頁頭', p.locator('header')],
        ['今日節目卡', p.getByRole('heading', { level: 1 })],
    ]);
    await checkListTouchScroll(
        cdp,
        p,
        log,
        label,
        p.getByRole('region', { name: '今日節目' }).getByRole('list'),
    );
    await checkCardSwipes(cdp, p, log, label);
    await checkCardDragNeverSeeks(cdp, p, log, label);
    await checkRingDragNeverSwitches(cdp, p, log, label);
    await p.screenshot({ path: `${env.out}/touch-today-${label.split(' ')[0]}.png` });
};

/** 橫向手機：main 自己捲（手指拖得落去），文件本身唔捲 */
const checkLandscape = async (env, route, zone, label) => {
    const { p, cdp, log } = env;
    await p.goto(`${env.base}${route}`);
    await waitPlaying(p);
    await p.waitForTimeout(500);
    await checkRootLocked(p, log, label);
    const main = p.locator('main');
    const extra = await main.evaluate((el) => el.scrollHeight - el.clientHeight);
    // 由 swipe 區（日子條 / 今日節目卡）開始直向拖：佢哋喺 main 入面，矮畫面要畀返直向 pan
    const start = centreOf(await zone(p).boundingBox());
    await touchDrag(cdp, p, start, { dx: 0, dy: -Math.min(VERTICAL_DRAG_PX, start.y - 10) });
    const scrolled = await main.evaluate((el) => el.scrollTop);
    const doc = await docScroll(p);
    log(
        extra > 0 && scrolled > 0 && isDocLocked(doc),
        `${label}：main 自己捲（多出 ${extra}px，scrollTop ${scrolled}），文件唔捲 ${JSON.stringify(doc)}`,
    );
    const forward = p.getByRole('button', { name: '前進 60 秒' });
    await forward.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const b = await forward.boundingBox();
    log(
        b !== null && b.y >= 0 && b.y + b.height <= LANDSCAPE.height,
        `${label}：捲 main 捲得到控制掣（y ${b?.y?.toFixed(0)}）`,
    );
};

/** 全部觸控檢查；每個尺寸用獨立 context（新鮮播放狀態） */
export const runTouchChecks = async ({ browser, base, out, serveAudio, errors, log }) => {
    for (const viewport of TOUCH_VIEWPORTS) {
        const size = `${viewport.width}×${viewport.height}`;
        const { ctx, p, cdp, safeArea } = await openTouchPage(
            browser,
            serveAudio,
            errors,
            viewport,
        );
        console.log(`(觸控 ${size}：安全區模擬${safeArea ? '已開' : '唔支援'})`);
        const env = { p, cdp, log, base, out };
        await checkHome(env, `${size} 觸控主頁`);
        await checkShow(env, `${size} 觸控節目頁`);
        await checkToday(env, `${size} 觸控今日節目頁`);
        await ctx.close();
    }
    const size = `${LANDSCAPE.width}×${LANDSCAPE.height}`;
    const { ctx, p, cdp } = await openTouchPage(browser, serveAudio, errors, LANDSCAPE);
    const env = { p, cdp, log, base, out };
    const strip = (page) => page.locator(STRIP);
    const card = (page) => page.getByRole('heading', { level: 1 });
    await checkLandscape(env, '#/show/badgirl', strip, `${size} 觸控節目頁（橫向，由日子條拖）`);
    await checkLandscape(env, '#/today', card, `${size} 觸控今日節目頁（橫向，由卡拖）`);
    await ctx.close();
};
