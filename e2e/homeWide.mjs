// 闊橫版主頁 e2e（v1.21.x，CUI-0015）：iPad 打橫（1180×820）主頁按 main[data-layout] 分流。
// fill = 冇 mini player 全闊填滿格；split = 左格 + 右邊播放卡；fillWithHandle = ✕ 閂咗卡、右邊把手。
// 每個情境用獨立 context，唔受 run.mjs 主流程之前播過乜影響
import {
    ensurePlaying,
    isShown,
    newE2EPage,
    runSection,
    waitForPlaybackState,
} from './harness.mjs';
import { dismissAutoSheet, SERIES_ROUTE } from './dramaPages.mjs';

// iPad 打橫：高 ≥ 562 先係闊橫版（src/config/layout.ts WIDE_BANNER_QUERY）
const WIDE = { width: 1180, height: 820 };
// 星期日：假錄音（sampleData.mjs）冇節目，主頁冇 mini player（同 miniPlayerRules.mjs 一樣）
const E2E_SUNDAY = '2026-11-29T22:30:00+08:00';
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
// 滑鼠轆捲幾多 px：夠證明清單自己捲
const LIST_SCROLL_PX = 200;
// 滑鼠轆之後等捲動完（smooth scroll / 事件處理）
const WHEEL_SETTLE_MS = 300;

const ANY_MINI_REGION = /^正在播放/;
// 平日冇嘢載入：張卡係今日節目（同直版 mini player 一樣）
const TODAY_REGION = '正在播放（今日節目）';
const CLOSE_LABEL = '關閉播放器';
// 公子會（星期六）最近一集 28/11：入節目頁自動播，返主頁就係重溫
const REWATCH_SHOW = { name: '公子會', route: '#/show/gongzi' };
const REOPEN_LABEL = `已暫停：${REWATCH_SHOW.name}，打開播放器`;
// 把手上面嘅狀態字（src/i18n/zh-HK.ts homeCard.pausedStatus）；刻意寫死做獨立對照
const PAUSED_STATUS = '已暫停';
// 張卡頁頭列嘅開頁掣（後面跟「，重溫 28/11（六）」）
const REWATCH_OPEN = new RegExp(`^開啟 ${REWATCH_SHOW.name} 節目頁`);
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
    // 真滑鼠轆（唔係 JS 設 scrollTop）：捲得郁先證明清單自己捲，同時睇張卡同成頁有冇被帶住郁
    const ul = list.locator('ul');
    const cardTop = () => card(p).evaluate((el) => el.getBoundingClientRect().top);
    const topBefore = await cardTop();
    await ul.hover();
    await p.mouse.wheel(0, LIST_SCROLL_PX);
    await p.waitForTimeout(WHEEL_SETTLE_MS);
    const listTop = await ul.evaluate((el) => el.scrollTop);
    const pageTop = await p.evaluate(() => document.scrollingElement.scrollTop);
    const topAfter = await cardTop();
    log(
        listTop > 0 && pageTop === 0 && topAfter === topBefore,
        `${label}：滑鼠轆喺卡入面捲清單，成頁唔郁（清單 ${listTop}px、頁 ${pageTop}px、卡頂 ${topBefore} → ${topAfter}）`,
    );
};

/**
 * 頁頭列今日 / 重溫標籤（3a）：橫版大畫面 --ui-scale 放大字，量瀏覽器實際計出嚟嘅樣式：
 * 行高唔細過字、上下有內邊、膠囊喺頁頭列入面，字唔會頂住膠囊邊
 */
const TAG_TEXT = { today: '今日', rewatch: '重溫' };

const checkCardTag = async (p, log, label, kind) => {
    const tag = card(p).locator(`[data-tag="${kind}"]`);
    if ((await tag.count()) !== 1) {
        log(false, `${label}：頁頭列有${TAG_TEXT[kind]}標籤`);
        return;
    }
    const m = await tag.evaluate((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        // 頁頭列唔再係 <button> 都只係記一項失敗，唔好成個 section throw
        const h = el.closest('button')?.getBoundingClientRect();
        return {
            font: parseFloat(s.fontSize),
            line: parseFloat(s.lineHeight),
            pad: Math.min(parseFloat(s.paddingTop), parseFloat(s.paddingBottom)),
            inside: Boolean(h) && r.top >= h.top && r.bottom <= h.bottom,
        };
    });
    log(
        m.line >= m.font && m.pad > 0 && m.inside,
        `${label}：${TAG_TEXT[kind]}標籤字唔頂邊（字 ${m.font}px、行高 ${m.line}px、上下內邊 ${m.pad}px）`,
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
    await checkCardTag(p, log, label, 'today');
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
    await checkCardTag(p, log, label, 'rewatch');

    // 闊橫版冇底部 mini player：成頁得張卡角一粒關閉掣
    await p.getByRole('button', { name: CLOSE_LABEL, exact: true }).click();
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
    // 「已暫停」直寫要真係排到出嚟（jsdom 冇 layout）：三個字至少三個字高，唔俾長名擠走
    const status = await handle.getByText(PAUSED_STATUS, { exact: true }).boundingBox();
    const statusFont = await handle
        .getByText(PAUSED_STATUS, { exact: true })
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    log(
        status !== null && status.height >= PAUSED_STATUS.length * statusFont,
        `${label}：把手見到「${PAUSED_STATUS}」（高 ${status?.height}px，字 ${statusFont}px）`,
    );
    log(
        after.nav.width > before.nav.width &&
            after.handle !== null &&
            after.nav.right <= after.handle.left,
        `${label}：閂卡後節目格變闊（${before.nav.width} → ${after.nav.width}px），唔遮把手`,
    );

    await handle.click();
    const reopened = await hasLayout(p, 'split');
    const header = card(p).getByRole('button', { name: REWATCH_OPEN });
    log(
        reopened && (await header.count()) === 1,
        `${label}：撳把手開返張卡，係閂咗嗰個節目（${await layoutOf(p)}，${await header.getAttribute('aria-label')}）`,
    );
    await p.waitForTimeout(NO_AUTOPLAY_WAIT_MS);
    const state = await p.evaluate(() => navigator.mediaSession.playbackState);
    log(state !== 'playing', `${label}：開返張卡停喺暫停，唔自動播（${state}）`);
    await ctx.close();
};

// 內頁把手（P3 #4）：mockup 嘅闊橫版 1300×800（--ui-scale 1.5）
const INNER_WIDE = { width: 1300, height: 800 };
// 把手讀屏名：狀態 + 播緊嘅節目名 + 返回主頁（src/i18n/zh-HK.ts pageHandle）；刻意寫死做獨立對照
const PAGE_HANDLE_PLAYING = `播放中：${REWATCH_SHOW.name}，返回主頁`;
const PAGE_HANDLE_ANY = new RegExp(`^(播放中|已暫停)：${REWATCH_SHOW.name}，返回主頁$`);
const PLAYING_STATUS = '播放中';
// 喺呢頁開始播：把手淡出（tokens.css --duration-page-handle-fade）再拆走，最多等幾耐
const HANDLE_GONE_MS = 3000;

const pageHandle = (p) => p.locator('[data-page-handle]');

/** 用 app 自己嘅 hash route 轉頁（唔重新載入，player 照播） */
const goToRoute = (p, route) =>
    p.evaluate((hash) => {
        window.location.hash = hash;
    }, route);

/** 把手位置、狀態字高同字大、播放器欄有冇讓開把手（main 內容右邊唔過把手左邊） */
const measurePageHandle = (p) =>
    p.evaluate(() => {
        const handle = document.querySelector('[data-page-handle]');
        const main = document.querySelector('main');
        if (!handle || !main) return null;
        const status = handle.querySelector('[aria-hidden="true"]');
        const box = handle.getBoundingClientRect();
        const contentRight =
            main.getBoundingClientRect().right - parseFloat(getComputedStyle(main).paddingRight);
        return {
            right: box.right,
            left: box.left,
            contentRight,
            statusHeight: status?.getBoundingClientRect().height ?? 0,
            statusFont: status ? parseFloat(getComputedStyle(status).fontSize) : 0,
        };
    });

// 再入短篇劇集頁：未聽過呢套劇，全集表可能再彈出；等佢最多幾耐
const SHEET_WAIT_MS = 2000;

/** 全集表彈咗出嚟就撳 Esc 閂（佢係 modal，背後嘅掣唔喺 accessibility tree） */
const closeSheetIfOpen = async (p) => {
    const sheet = p.getByRole('dialog', { name: '全集' });
    if (!(await isShown(sheet, { timeout: SHEET_WAIT_MS }))) return;
    await p.keyboard.press('Escape');
    await isShown(sheet, { state: 'detached', timeout: SHEET_WAIT_MS });
};

/** 播緊公子會入劇集頁：右邊出「播放中：公子會」把手，播放器讓位，唔遮 */
const checkHandleOnOtherPage = async (p, log, label) => {
    const handle = p.getByRole('button', { name: PAGE_HANDLE_PLAYING, exact: true });
    const shown = await isShown(handle, { timeout: LAYOUT_WAIT_MS });
    const m = shown ? await measurePageHandle(p) : null;
    log(
        m !== null && INNER_WIDE.width - m.right <= HANDLE_EDGE_PX,
        `${label}：劇集頁右邊緣出把手「${PAGE_HANDLE_PLAYING}」（把手右 ${m?.right}）`,
    );
    log(
        m !== null && m.statusHeight >= PLAYING_STATUS.length * m.statusFont,
        `${label}：把手見到「${PLAYING_STATUS}」（高 ${m?.statusHeight}px，字 ${m?.statusFont}px）`,
    );
    log(
        m !== null && m.contentRight <= m.left,
        `${label}：內頁右邊預留把手位（內容右 ${m?.contentRight}、把手左 ${m?.left}）`,
    );
    return shown;
};

/** 撳把手 = 返回：返主頁出返右邊播放卡（公子會） */
const checkHandleGoesHome = async (p, log, label) => {
    await pageHandle(p).click();
    const split = await hasLayout(p, 'split');
    const header = card(p).getByRole('button', { name: REWATCH_OPEN });
    log(
        split && (await header.count()) === 1,
        `${label}：撳把手返主頁，右邊係${REWATCH_SHOW.name}播放卡（${await layoutOf(p)}）`,
    );
};

/** 喺劇集頁開始播呢套劇：把手淡出拆走，預留位收返 */
const checkHandleLeaves = async (p, log, label) => {
    const shown = await isShown(p.getByRole('button', { name: PAGE_HANDLE_ANY }), {
        timeout: LAYOUT_WAIT_MS,
    });
    await p.getByRole('button', { name: '播放', exact: true }).click();
    const gone = await isShown(pageHandle(p), { state: 'detached', timeout: HANDLE_GONE_MS });
    const padding = await p
        .locator('main')
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).paddingRight));
    log(
        shown && gone && padding === 0,
        `${label}：喺劇集頁開始播，把手消失、預留位收返（出過 ${shown}，消失 ${gone}，右邊 ${padding}px）`,
    );
};

/**
 * 內頁把手（P3 #4）：播緊公子會時自己節目頁冇把手；入劇集頁出「播放中」把手（讓位、狀態字排到出嚟）；
 * 撳把手返主頁；再入劇集頁開始播呢套劇，把手消失
 */
const checkInnerPageHandle = async ({ browser, base, errors, log }) => {
    const label = '闊橫版內頁把手';
    const { ctx, p } = await newE2EPage(browser, errors, { viewport: INNER_WIDE });
    await p.goto(`${base}${REWATCH_SHOW.route}`);
    await ensurePlaying(p);
    const own = await pageHandle(p).count();
    log(own === 0, `${label}：喺播緊嘅${REWATCH_SHOW.name}節目頁冇把手（${own} 個）`);

    await goToRoute(p, SERIES_ROUTE);
    if (!(await dismissAutoSheet(p, log, label))) return ctx.close();
    if (await checkHandleOnOtherPage(p, log, label)) await checkHandleGoesHome(p, log, label);

    await goToRoute(p, SERIES_ROUTE);
    await closeSheetIfOpen(p);
    await checkHandleLeaves(p, log, label);
    await ctx.close();
};

// 播放卡動畫（P4 #3b，_mockups_/player-card-motion）：開卡 O1、換節目 S3 都係 View Transition
// （src/utils/viewTransition.ts 嘅 kind，html[data-view-transition]）
const PROGRESS_KEY = '903player:progress:v1';
// 兩套短篇劇集第一集（src/catalog/dramas/library/*/drama.json 推出嚟）；刻意寫死做獨立對照
const DRAMA_BASE = 'https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev';
const MOTION_DRAMAS = [
    {
        name: '芝See菇Bi Family',
        url: `${DRAMA_BASE}/%E8%8A%9DSee%E8%8F%87Bi%20Family/%E4%B8%89%E5%8D%81%E5%85%AD%E8%A8%88/01%20-%20%E4%B8%89%E5%8D%81%E5%85%AD%E8%A8%88%20-%20%E7%AC%AC%E4%B8%80%E9%9B%86%20-%20%E7%9E%9E%E5%A4%A9%E9%81%8E%E6%B5%B7%20_%20%E9%9A%A0%E5%BD%A2%E5%A2%A8%E6%B0%B4%E7%AD%86.m4a`,
    },
    {
        name: '少爺占系列',
        url: `${DRAMA_BASE}/%E5%B0%91%E7%88%BA%E5%8D%A0%E7%B3%BB%E5%88%97/%E5%85%AB%E7%8E%8B%E5%AD%90/01%20-%20%E5%85%AB%E7%8E%8B%E5%AD%90%20-%20%E7%AC%AC%E4%B8%80%E9%9B%86.m4a`,
    },
];
// 聽咗一截（未聽完）：書架先有「繼續收聽」
const PARTIAL_PROGRESS = { position: 60, duration: 600, watched: false };
const DRAMA_REGION = '正在播放（廣播劇）';
// 過場等幾耐先睇結果（--view-transition-move 520ms + render）
const MOTION_SETTLE_MS = 1500;

/**
 * 喺瀏覽器入面行（addInitScript）：寫入兩套劇嘅進度；記低每個 View Transition 嘅 kind，
 * 同佢有冇真係行到（ready）定係畀瀏覽器跳過（例如撞名，S-633）
 */
const installMotionProbe = ({ key, urls, progress }) => {
    const map = Object.fromEntries(
        urls.map((url) => [url, { ...progress, updatedAt: Date.now() }]),
    );
    localStorage.setItem(key, JSON.stringify(map));
    window.__e2eTransitions = [];
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    document.startViewTransition = (update) => {
        const transition = start(update);
        const entry = { kind: document.documentElement.dataset.viewTransition, ran: null };
        window.__e2eTransitions.push(entry);
        transition.ready.then(
            () => (entry.ran = true),
            () => (entry.ran = false),
        );
        return transition;
    };
};

const transitionsOf = (p) => p.evaluate(() => window.__e2eTransitions);

const resumeDrama = (p, name) =>
    p.getByRole('button', { name: new RegExp(`^${name}，繼續收聽`) }).click();

const cardShows = (p, name) =>
    isShown(card(p).getByRole('button', { name: `開啟 ${name} 廣播劇頁` }), {
        timeout: LAYOUT_WAIT_MS,
    });

const homeHandle = (p) => p.locator('[data-home-handle]');

/**
 * ✕ 閂卡（fillWithHandle）再撳書架繼續收聽：同撳把手一樣經 open 過場 slide 入，
 * 把手留喺舊畫面跟住淡走，之後冇咗（P4 #3b 跟進）
 */
const checkResumeFromHandle = async (p, log, label, name) => {
    await p.getByRole('button', { name: CLOSE_LABEL, exact: true }).click();
    const closed = (await hasLayout(p, 'fillWithHandle')) && (await homeHandle(p).count()) === 1;
    await p.waitForTimeout(MOTION_SETTLE_MS);
    const before = (await transitionsOf(p)).length;
    await resumeDrama(p, name);
    const opened = (await hasLayout(p, 'split')) && (await cardShows(p, name));
    await p.waitForTimeout(MOTION_SETTLE_MS);
    const runs = (await transitionsOf(p)).slice(before);
    const handles = await homeHandle(p).count();
    log(
        closed &&
            opened &&
            runs.length === 1 &&
            runs[0].kind === 'open' &&
            runs[0].ran &&
            handles === 0,
        `${label}：✕ 閂卡後撳「${name}」繼續收聽，張卡經 open 過場出、把手淡走（${JSON.stringify(runs)}，把手 ${handles}）`,
    );
};

/** 冇卡（星期日）撳繼續收聽：張卡經 open 過場出嚟；再撳另一套劇：張卡經 switch 反轉；✕ 後再繼續收聽：把手淡走 */
const checkCardMotion = async ({ browser, base, errors, log }) => {
    const label = '闊橫版主頁播放卡動畫';
    const { ctx, p } = await newE2EPage(browser, errors, { viewport: WIDE }, { now: E2E_SUNDAY });
    const urls = MOTION_DRAMAS.map((d) => d.url);
    await ctx.addInitScript(installMotionProbe, {
        key: PROGRESS_KEY,
        urls,
        progress: PARTIAL_PROGRESS,
    });
    await openWideHome(p, base);
    await p.getByRole('button', { name: '廣播劇', exact: true }).click();
    const [first, second] = MOTION_DRAMAS;

    await resumeDrama(p, first.name);
    const opened = (await hasLayout(p, 'split')) && (await cardShows(p, first.name));
    await p.waitForTimeout(MOTION_SETTLE_MS);
    const afterOpen = await transitionsOf(p);
    log(
        opened && afterOpen.length === 1 && afterOpen[0].kind === 'open' && afterOpen[0].ran,
        `${label}：冇卡撳「${first.name}」繼續收聽，張卡經 open 過場出（${JSON.stringify(afterOpen)}）`,
    );

    await resumeDrama(p, second.name);
    const switched = await cardShows(p, second.name);
    await p.waitForTimeout(MOTION_SETTLE_MS);
    const flips = (await transitionsOf(p)).slice(afterOpen.length);
    const region = await card(p).getAttribute('aria-label');
    log(
        switched &&
            region === DRAMA_REGION &&
            flips.length === 1 &&
            flips[0].kind === 'switch' &&
            flips[0].ran,
        `${label}：再撳「${second.name}」繼續收聽，張卡反轉（switch）做新劇集（${JSON.stringify(flips)}）`,
    );
    await checkResumeFromHandle(p, log, label, first.name);
    await ctx.close();
};

const SCENARIOS = [
    ['闊橫版主頁（冇 mini player）', checkFill],
    ['闊橫版主頁（有 mini player）', checkSplit],
    ['闊橫版主頁播放卡閂卡 / 開返', checkCloseAndReopen],
    ['闊橫版內頁把手', checkInnerPageHandle],
    ['闊橫版主頁播放卡動畫', checkCardMotion],
];

/** 闊橫版主頁：fill / split（卡闊、卡清單）/ ✕ 閂卡 → 把手 → 開返；每個情境各自一個 section，一個 throw 唔會跳過其他（O3） */
export const runHomeWideChecks = async (env) => {
    for (const [label, check] of SCENARIOS) {
        await runSection(env.log, label, () => check(env), env.browser);
    }
};
