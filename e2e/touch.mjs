// 觸控 e2e：Chromium 手機模擬（hasTouch + isMobile）+ CDP Input.dispatchTouchEvent。
// page.touchscreen 只識 tap，拖動要自己逐格發 touchMove。
// 模擬唔到 iOS 橡筋同 standalone 嘅 viewport 怪癖，所以另外斷言根元素嘅 CSS 鎖。
import { ensurePlaying, newE2EContext } from './harness.mjs';

const TOUCH_VIEWPORTS = [
    // iPhone 14/15（有 Dynamic Island：頂 47–59px、底 34px 安全區）同 iPhone SE（Home 掣）
    { width: 390, height: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 } },
    { width: 375, height: 667, insets: { top: 20, bottom: 0, left: 0, right: 0 } },
];
// 橫向手機：矮螢幕斷點（tokens.css max-height: 561px）以下，照樣固定版面（唔會成頁捲）
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
// 唱片格 viewBox 同弧形半徑（同 src/components/ArcSlider/ArcSlider.constants.ts 一樣）
const GAUGE_VIEWBOX = 300;
const GAUGE_CENTRE = { x: GAUGE_VIEWBOX / 2, y: GAUGE_VIEWBOX / 2 };
const RING_RADIUS = 140;
// 唱片格角落（viewBox 入面約 (12, 12)），圓環以外：交畀卡疊 swipe
const CORNER_RATIO = 12 / GAUGE_VIEWBOX;
// 捽碟手指離圓心：碟半徑係唱片格嘅 36%，揀 30% 喺碟面中段
const DISC_SCRUB_RADIUS_RATIO = 0.3;
// 慢慢捽轉一圈 60 秒（src/config/constants.ts DISC_SCRUB_MIN_SECONDS_PER_TURN）
const DISC_QUARTER_TURN_S = 15;
// 慢慢捽：每格 9°（90° / STEPS）隔 90ms ≈ 0.1°/ms，低過加速門檻（DISC_SCRUB_SLOW_DEGREES_PER_MS 0.15）
const DISC_SLOW_STEP_MS = 90;
// 快速撥：每格 18°（半圈 / STEPS）隔 STEP_MS ≈ 1.1°/ms，加速；半圈要行多過慢慢捽嘅兩倍（> 60s）
const HALF_TURN_DEGREES = 180;
const DISC_FLICK_MIN_S = 60;
// 捽碟由碟頂順時針轉四分一圈
const DISC_START_DEGREES = -90;
const QUARTER_TURN_DEGREES = 90;
// 底部缺口入面嘅角度（由右邊順時針）：離缺口尾端（45°）25°（> 12° 容差），亦避開中間嘅由頭播放掣
const GAP_DEGREES = 70;
const GAP_DRAG_PX = 60;
// 弧形頂（= 一半）拖去右邊（≈ 5/6）：如果 ring 冇被鎖，會 seek 去好遠
const RING_TOP = { x: GAUGE_CENTRE.x, y: GAUGE_CENTRE.y - RING_RADIUS };
const RING_RIGHT = { x: GAUGE_CENTRE.x + RING_RADIUS, y: GAUGE_CENTRE.y };
const TODAY_STACK = '今日節目，左右掃動轉節目';
const STRIP = '[aria-roledescription="轉集"]';
const MINI_REGION = '正在播放（今日節目）';

/** 開一個 iPhone 似嘅觸控 context；支援就順便模擬安全區（env(safe-area-inset-*)） */
const openTouchPage = async (browser, errors, { width, height, insets }, extra = {}) => {
    // 同 run.mjs 一樣嘅固定時鐘同 audio host
    const ctx = await newE2EContext(browser, {
        viewport: { width, height },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 3,
        colorScheme: 'dark',
        ...extra,
    });
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

/** 今日節目卡疊最上面嗰張卡嘅節目名（h1 係頁頭「今日節目」，卡入面係 h2） */
const cardTitle = (p) =>
    p.getByRole('group', { name: TODAY_STACK }).getByRole('heading', { level: 2 });
const heading = (p) => cardTitle(p).textContent();

/** 今日節目卡：橫拖（帶直向抖動）轉節目；向左 = 下一個，向右 = 上一個 */
const checkCardSwipes = async (cdp, p, log, label) => {
    const start = centreOf(await cardTitle(p).boundingBox());
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

/** 由唱片格角落（圓環以外）拖卡：卡跟手指，但進度唔會 seek */
const checkCardDragNeverSeeks = async (cdp, p, log, label) => {
    const slider = p.getByRole('slider', { name: '播放進度' });
    const before = Number(await slider.getAttribute('aria-valuenow'));
    const box = await slider.boundingBox();
    const corner = { x: box.x + CORNER_RATIO * box.width, y: box.y + CORNER_RATIO * box.height };
    const end = await touchDrag(cdp, p, corner, { dx: -60, dy: 6 }, { release: false });
    const phase = await p.getByRole('group', { name: TODAY_STACK }).getAttribute('data-phase');
    const during = Number(await slider.getAttribute('aria-valuenow'));
    await end();
    log(
        phase === 'dragging' && Math.abs(during - before) <= SEEK_TOLERANCE_S,
        `${label}：由唱片格角落拖卡會拖卡唔會 seek（${phase}，${before}s → ${during}s）`,
    );
};

/** 秒數差加正負號：+15s / -100s（唔會出 +-100s） */
const signedSeconds = (seconds) => `${seconds >= 0 ? '+' : ''}${seconds}s`;

/** 圓周上某個角度嘅點（0° 指向右，順時針為正） */
const circlePoint = (centre, radius, degrees) => {
    const radians = (degrees * Math.PI) / 180;
    return { x: centre.x + radius * Math.cos(radians), y: centre.y + radius * Math.sin(radians) };
};

/** 一隻手指沿圓周由 from 度轉去 to 度（0° 指向右，順時針為正），分 STEPS 格，每格隔 stepMs */
const touchArc = async (cdp, p, centre, radius, from, to, stepMs = STEP_MS) => {
    const at = (degrees) => circlePoint(centre, radius, degrees);
    const send = (type, points) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    await send('touchStart', [at(from)]);
    for (let i = 1; i <= STEPS; i += 1) {
        await send('touchMove', [at(from + ((to - from) * i) / STEPS)]);
        await p.waitForTimeout(stepMs);
    }
    await send('touchEnd', []);
    await p.waitForTimeout(SETTLE_MS);
};

/** 唱片格 viewBox 入面某點嘅畫面座標 */
const gaugePoint = (box, { x, y }) => ({
    x: box.x + (x / GAUGE_VIEWBOX) * box.width,
    y: box.y + (y / GAUGE_VIEWBOX) * box.height,
});

/** 節目頁：喺弧形底部缺口起手橫拖，唔會 seek（缺口唔屬於圓環） */
const checkRingGapIgnored = async (cdp, p, log, label) => {
    const slider = p.getByRole('slider', { name: '播放進度' });
    const box = await slider.boundingBox();
    const before = Number(await slider.getAttribute('aria-valuenow'));
    await touchDrag(cdp, p, gaugePoint(box, circlePoint(GAUGE_CENTRE, RING_RADIUS, GAP_DEGREES)), {
        dx: GAP_DRAG_PX,
        dy: 0,
    });
    const after = Number(await slider.getAttribute('aria-valuenow'));
    log(
        Math.abs(after - before) <= SEEK_TOLERANCE_S,
        `${label}：喺弧形底部缺口拖唔會 seek（${before}s → ${after}s）`,
    );
};

/**
 * 兩隻手指：先撳碟，再撳弧形，兩隻一齊郁。碟擁有手勢，弧形被鎖住：
 * 只會跟捽碟向前約 15 秒，唔會跟弧形 seek 去右邊
 */
/**
 * 兩隻手指（id 0、1）：先撳 first(0)，再撳 second(0)，之後一齊郁到 first(1) / second(1)，最後一齊放。
 * first / second 係 0–1 進度去畫面座標嘅 function
 */
const touchTwoFingers = async (cdp, p, first, second, stepMs = STEP_MS) => {
    const send = (type, points) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    const at = (t) => [
        { ...first(t), id: 0 },
        { ...second(t), id: 1 },
    ];
    await send('touchStart', [at(0)[0]]);
    await send('touchStart', at(0));
    for (let i = 1; i <= STEPS; i += 1) {
        await send('touchMove', at(i / STEPS));
        await p.waitForTimeout(stepMs);
    }
    await send('touchEnd', []);
    await p.waitForTimeout(SETTLE_MS);
};

const checkTwoFingerSingleSeek = async (cdp, p, log, label) => {
    const slider = p.getByRole('slider', { name: '播放進度' });
    const box = await slider.boundingBox();
    const radius = DISC_SCRUB_RADIUS_RATIO * box.width;
    const disc = (t) =>
        circlePoint(centreOf(box), radius, DISC_START_DEGREES + QUARTER_TURN_DEGREES * t);
    const [from, to] = [gaugePoint(box, RING_TOP), gaugePoint(box, RING_RIGHT)];
    const ring = (t) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
    const before = Number(await slider.getAttribute('aria-valuenow'));
    await touchTwoFingers(cdp, p, disc, ring, DISC_SLOW_STEP_MS);
    const moved = Number(await slider.getAttribute('aria-valuenow')) - before;
    log(
        Math.abs(moved - DISC_QUARTER_TURN_S) <= SEEK_TOLERANCE_S,
        `${label}：兩隻手指撳碟同弧形，只跟捽碟 seek（${signedSeconds(moved)}，預期約 +${DISC_QUARTER_TURN_S}s）`,
    );
};

/** 今日節目卡最上面嗰張（可以捽嘅）碟面 */
const discFace = (p) => p.locator('[class*="scrubbable"] [class*="face"]').first();

/** 播緊時碟面自轉（CSS animation 喺度行） */
const checkDiscSpins = async (p, log, label) => {
    const state = await discFace(p).evaluate((el) => getComputedStyle(el).animationPlayState);
    log(state === 'running', `${label}：播緊時碟自轉（animation-play-state ${state}）`);
};

/** 捽碟：順時針轉四分一圈 = 向前 15 秒，碟面跟手指轉，唔會轉節目 */
const checkDiscScrub = async (cdp, p, log, label) => {
    const slider = p.getByRole('slider', { name: '播放進度' });
    const box = await slider.boundingBox();
    const title = await heading(p);
    const before = Number(await slider.getAttribute('aria-valuenow'));
    const to = DISC_START_DEGREES + QUARTER_TURN_DEGREES;
    await touchArc(
        cdp,
        p,
        centreOf(box),
        DISC_SCRUB_RADIUS_RATIO * box.width,
        DISC_START_DEGREES,
        to,
        DISC_SLOW_STEP_MS,
    );
    const after = Number(await slider.getAttribute('aria-valuenow'));
    const moved = after - before;
    // 正常動畫下碟面有手動角度：減少動畫嗰個 check 斷言「冇 transform」先唔會因為揀錯元素白過
    const transform = await discFace(p).evaluate((el) => el.style.transform);
    log(
        Math.abs(moved - DISC_QUARTER_TURN_S) <= SEEK_TOLERANCE_S &&
            transform.startsWith('rotate(') &&
            (await heading(p)) === title,
        `${label}：順時針捽碟四分一圈向前約 ${DISC_QUARTER_TURN_S}s、碟跟手指轉（${transform}），唔轉節目（${before}s → ${after}s）`,
    );
};

/** 捽碟加速：快速撥半圈，行多過慢慢捽嘅兩倍 */
const checkDiscFlick = async (cdp, p, log, label) => {
    const slider = p.getByRole('slider', { name: '播放進度' });
    const box = await slider.boundingBox();
    const before = Number(await slider.getAttribute('aria-valuenow'));
    await touchArc(
        cdp,
        p,
        centreOf(box),
        DISC_SCRUB_RADIUS_RATIO * box.width,
        DISC_START_DEGREES,
        DISC_START_DEGREES + HALF_TURN_DEGREES,
    );
    const moved = Number(await slider.getAttribute('aria-valuenow')) - before;
    log(
        moved > DISC_FLICK_MIN_S,
        `${label}：快速撥碟半圈加速（${signedSeconds(moved)}，預期多過 +${DISC_FLICK_MIN_S}s）`,
    );
};

/** 喺弧形進度條上橫拖：seek 或者乜都唔做，但唔可以轉節目 */
const checkRingDragNeverSwitches = async (cdp, p, log, label) => {
    const box = await p.getByRole('slider', { name: '播放進度' }).boundingBox();
    const before = await heading(p);
    // 弧形左邊（viewBox 入面約 (20, 150)），唱片外面
    const start = gaugePoint(box, { x: 20, y: GAUGE_CENTRE.y });
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

const waitPlaying = ensurePlaying;

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
    await checkRingGapIgnored(cdp, p, log, label);
    await checkTwoFingerSingleSeek(cdp, p, log, label);
};

const checkToday = async (env, label) => {
    const { p, cdp, log } = env;
    await p.goto(`${env.base}#/today`);
    await waitPlaying(p);
    await p.waitForTimeout(500);
    await checkRootLocked(p, log, label);
    await checkVerticalDragsLocked(cdp, p, log, label, [
        ['頁頭', p.locator('header')],
        ['今日節目卡', cardTitle(p)],
    ]);
    await checkListTouchScroll(
        cdp,
        p,
        log,
        label,
        p.getByRole('region', { name: '節目表' }).getByRole('list'),
    );
    await checkCardSwipes(cdp, p, log, label);
    await checkCardDragNeverSeeks(cdp, p, log, label);
    await checkRingDragNeverSwitches(cdp, p, log, label);
    await checkDiscSpins(p, log, label);
    await checkDiscScrub(cdp, p, log, label);
    await checkDiscFlick(cdp, p, log, label);
    await p.screenshot({ path: `${env.out}/touch-today-${label.split(' ')[0]}.png` });
};

/** 減少動畫：碟面唔自轉、捽碟唔跟手指轉，但照樣 seek */
const checkReducedMotion = async (env, label) => {
    const { p, cdp, log } = env;
    await p.goto(`${env.base}#/today`);
    await waitPlaying(p);
    await p.waitForTimeout(500);
    const face = discFace(p);
    const animation = await face.evaluate((el) => getComputedStyle(el).animationName);
    log(animation === 'none', `${label}：碟面冇自轉 animation（${animation}）`);
    // 先暫停：慢速捽碟成個手勢要 1–2 秒，播緊嘅話量到嘅 seek 會包埋播放前進咗嘅時間（CUI-0003）
    await p.getByRole('button', { name: '暫停', exact: true }).click();
    await p.getByRole('button', { name: '播放', exact: true }).waitFor();
    const slider = p.getByRole('slider', { name: '播放進度' });
    const box = await slider.boundingBox();
    const before = Number(await slider.getAttribute('aria-valuenow'));
    await touchArc(
        cdp,
        p,
        centreOf(box),
        DISC_SCRUB_RADIUS_RATIO * box.width,
        DISC_START_DEGREES,
        DISC_START_DEGREES + QUARTER_TURN_DEGREES,
        DISC_SLOW_STEP_MS,
    );
    const moved = Number(await slider.getAttribute('aria-valuenow')) - before;
    const transform = await face.evaluate((el) => el.style.transform);
    log(
        transform === '' && Math.abs(moved - DISC_QUARTER_TURN_S) <= SEEK_TOLERANCE_S,
        `${label}：捽碟唔跟手指轉（transform「${transform}」）但照樣 seek（${signedSeconds(moved)}）`,
    );
};

/** 橫向手機（橫版兩欄）：固定版面，由頁頭 / 今日節目卡直向拖，main 同文件都唔捲，播放掣原本已經喺畫面 */
const checkLandscape = async (env, route, zone, label) => {
    const { p, cdp, log } = env;
    await p.goto(`${env.base}${route}`);
    await waitPlaying(p);
    await p.waitForTimeout(500);
    await checkRootLocked(p, log, label);
    const main = p.locator('main');
    const start = centreOf(await zone(p).boundingBox());
    await touchDrag(cdp, p, start, { dx: 0, dy: -Math.min(VERTICAL_DRAG_PX, start.y - 10) });
    const scrolled = await main.evaluate((el) => el.scrollTop);
    const doc = await docScroll(p);
    log(
        scrolled === 0 && isDocLocked(doc),
        `${label}：直向拖 main 唔捲（scrollTop ${scrolled}），文件唔捲 ${JSON.stringify(doc)}`,
    );
    const b = await p.getByRole('button', { name: /^(播放|暫停)$/ }).boundingBox();
    log(
        b !== null && b.y >= 0 && b.y + b.height <= LANDSCAPE.height,
        `${label}：播放掣喺畫面內（y ${b?.y?.toFixed(0)}）`,
    );
};

/** 橫向手機主頁（橫版）：一頁放晒唔分頁，橫掃節目格唔會捲走、文件唔捲 */
const checkLandscapeHome = async (env, label) => {
    const { p, cdp, log } = env;
    await p.goto(env.base);
    await p.waitForSelector('nav[aria-busy="false"]');
    await p.waitForTimeout(500);
    await checkRootLocked(p, log, label);
    const tile = p.locator('nav button').first();
    await touchDrag(cdp, p, centreOf(await tile.boundingBox()), { dx: -CARD_SWIPE_PX, dy: 0 });
    await p.waitForTimeout(SETTLE_MS);
    const pages = await p.getByRole('group', { name: /^節目第 \d+ 頁/ }).count();
    const scrolled = await p.locator('nav > div').evaluate((el) => el.scrollLeft);
    const doc = await docScroll(p);
    log(
        pages === 0 && scrolled === 0 && isDocLocked(doc),
        `${label}：唔分頁（指示點 ${pages}），橫掃唔捲（scrollLeft ${scrolled}），文件唔捲`,
    );
};

/** 全部觸控檢查；每個尺寸用獨立 context（新鮮播放狀態） */
export const runTouchChecks = async ({ browser, base, out, errors, log }) => {
    for (const viewport of TOUCH_VIEWPORTS) {
        const size = `${viewport.width}×${viewport.height}`;
        const { ctx, p, cdp, safeArea } = await openTouchPage(browser, errors, viewport);
        console.log(`(觸控 ${size}：安全區模擬${safeArea ? '已開' : '唔支援'})`);
        const env = { p, cdp, log, base, out };
        await checkHome(env, `${size} 觸控主頁`);
        await checkShow(env, `${size} 觸控節目頁`);
        await checkToday(env, `${size} 觸控今日節目頁`);
        await ctx.close();
    }
    const [phone] = TOUCH_VIEWPORTS;
    const reduced = await openTouchPage(browser, errors, phone, { reducedMotion: 'reduce' });
    await checkReducedMotion(
        { p: reduced.p, cdp: reduced.cdp, log, base, out },
        `${phone.width}×${phone.height} 觸控減少動畫`,
    );
    await reduced.ctx.close();
    const size = `${LANDSCAPE.width}×${LANDSCAPE.height}`;
    const { ctx, p, cdp } = await openTouchPage(browser, errors, LANDSCAPE);
    const env = { p, cdp, log, base, out };
    // 橫版唔出日子條：節目頁由頁頭（節目名）拖
    const heading = (page) => page.locator('header h1');
    const card = cardTitle;
    await checkLandscape(env, '#/show/badgirl', heading, `${size} 觸控節目頁（橫向，由頁頭拖）`);
    await checkLandscape(env, '#/today', card, `${size} 觸控今日節目頁（橫向，由卡拖）`);
    await checkLandscapeHome(env, `${size} 觸控主頁（橫向）`);
    await ctx.close();
};
