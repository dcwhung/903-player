// 成集收藏 e2e（P7 #7，_mockups_/bookmark）：集數清單 ☆ 收藏 → 主頁出 ★ tab；收藏 tab 撳行入頁唔播；
// ▷ 原地播（留喺主頁）；左滑移除最後一集 → ★ tab 消失、跳返「節目」。手機直版 + 闊橫版。
// 冇收藏有收聽記錄（_mockups_/qr-transfer ① B）：第三格係歷史 icon「最近收聽」、成個 tab 係清單、☆ 對齊；
// 移除最後一個收藏但有收聽記錄 → tab 留低變最近收聽（直版 + 窄橫版 + 闊橫版）。
// 每個情境用獨立 context，唔受 run.mjs 主流程之前播過乜影響
import { isShown, newE2EPage, reachesHash, runSection, waitForPlaybackState } from './harness.mjs';
import { PROGRESS_STORAGE_KEY } from './hiddenPlayback.mjs';
import { SAMPLE_RECORDINGS } from './sampleData.mjs';

/** 同 src/config/constants.ts BOOKMARK_STORAGE_KEY / VERSION 一樣（src/e2eSrcConstants.test.ts 鎖住） */
export const BOOKMARK_STORAGE_KEY = '903player:bookmarks:v1';
export const BOOKMARK_STORE_VERSION = 1;
/** 同 src/components/pages/home/SavedTab/useRowSwipe.ts SWIPE_REMOVE_RATIO 一樣（同上鎖住） */
export const SWIPE_REMOVE_RATIO = 0.4;

// 闊橫版：高 ≥ 562 先係（src/config/layout.ts WIDE_BANNER_QUERY）；同 mockup 截圖一樣大
const WIDE = { width: 1300, height: 800 };
// 主頁：直接開 base 時 hash 係空，轉頁返嚟係 #/，兩個都算
const HOME_HASHES = new Set(['', '#/']);
const SHOW_HASH = '#/show/gongzi';
const SAVED_TAB = '我的收藏';
// 公子會（星期六）17/10：sampleData 有嘅最近一集；行嘅讀屏名（src/i18n/zh-HK.ts bookmark.*）刻意寫死做獨立對照
const GONGZI = SAMPLE_RECORDINGS.find((r) => r.showId === 'gongzi' && r.date === '2026-10-17');
const ROW_OPEN = /^開啟 公子會 17\/10（六）/;
const ROW_PLAY = '播放 公子會 17/10（六）';
const ROW_PAUSE = '暫停 公子會 17/10（六）';
const LIST_STAR = '收藏 17/10 星期六';
const ADDED_TOAST = '已加入收藏';
// 等 UI 反應（toast、tab 闊度過場 520ms、轉頁）最多幾耐
const UI_WAIT_MS = 5000;
// 入頁之後等幾耐：會自動播嘅話呢段時間內已經播咗
const NO_AUTOPLAY_WAIT_MS = 1500;
// 左滑：拖過行闊幾多（過咗 SWIPE_REMOVE_RATIO）、分幾步郁（跟手指）
const SWIPE_PAST_RATIO = SWIPE_REMOVE_RATIO + 0.2;
const SWIPE_STEPS = 12;

/** 用戶之前已經收藏咗公子會 17/10（入主頁之前寫入 localStorage） */
const seedBookmark = async (ctx) => {
    const item = {
        kind: 'show',
        url: GONGZI.url,
        showId: GONGZI.showId,
        date: GONGZI.date,
        time: GONGZI.time,
        addedAt: 1,
    };
    await ctx.addInitScript(
        ({ key, value }) => {
            if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
        },
        {
            key: BOOKMARK_STORAGE_KEY,
            value: JSON.stringify({ version: BOOKMARK_STORE_VERSION, items: [item] }),
        },
    );
};

const savedTab = (p) => p.getByRole('button', { name: SAVED_TAB, exact: true });

const openSavedTab = async (p, base) => {
    await p.goto(base);
    await savedTab(p).click({ timeout: UI_WAIT_MS });
    await p.getByRole('region', { name: SAVED_TAB }).waitFor({ timeout: UI_WAIT_MS });
};

/** 節目頁清單撳 ☆ → toast；返主頁 → ★ tab 出咗，入面有嗰集 */
const checkAddFromList = async ({ browser, base, errors, log }, label, viewport) => {
    const { ctx, p } = await newE2EPage(browser, errors, viewport ? { viewport } : {});
    await p.goto(`${base}${SHOW_HASH}`);
    await p.getByRole('button', { name: LIST_STAR }).click({ timeout: UI_WAIT_MS });
    const toast = await isShown(p.getByRole('status').filter({ hasText: ADDED_TOAST }), {
        timeout: UI_WAIT_MS,
    });
    log(toast, `${label}：清單撳 ☆ 出「${ADDED_TOAST}」提示`);
    await p.getByRole('button', { name: '返回主頁' }).click();
    const tab = await isShown(savedTab(p), { timeout: UI_WAIT_MS });
    log(tab, `${label}：收藏咗之後主頁出 ★ tab`);
    await savedTab(p).click();
    log(await isShown(p.getByRole('button', { name: ROW_OPEN })), `${label}：收藏 tab 有嗰集`);
    await ctx.close();
};

/** 收藏 tab 撳行（▷ 以外）→ 入節目頁，唔播 */
const checkOpenWithoutPlaying = async ({ browser, base, errors, log }, label, viewport) => {
    const { ctx, p } = await newE2EPage(browser, errors, viewport ? { viewport } : {});
    await seedBookmark(ctx);
    await openSavedTab(p, base);
    await p.getByRole('button', { name: ROW_OPEN }).click();
    log(await reachesHash(p, SHOW_HASH), `${label}：撳行入咗公子會節目頁`);
    await p.waitForTimeout(NO_AUTOPLAY_WAIT_MS);
    const state = await p.evaluate(() => navigator.mediaSession.playbackState);
    log(state !== 'playing', `${label}：由收藏入頁唔播（mediaSession ${state}）`);
    const focused = await isShown(p.locator('li[data-focused]'), { timeout: UI_WAIT_MS });
    log(focused, `${label}：清單 highlight 咗收藏嗰集`);
    await ctx.close();
};

/** ▷ 原地播：播緊、留喺主頁、行變 ⏸ */
const checkPlayInPlace = async ({ browser, base, errors, log }, label, viewport) => {
    const { ctx, p } = await newE2EPage(browser, errors, viewport ? { viewport } : {});
    await seedBookmark(ctx);
    await openSavedTab(p, base);
    await p.getByRole('button', { name: ROW_PLAY, exact: true }).click();
    const state = await waitForPlaybackState(p, 'playing');
    log(state === 'playing', `${label}：撳 ▷ 開始播（mediaSession ${state}）`);
    const hash = new URL(p.url()).hash;
    log(HOME_HASHES.has(hash), `${label}：播嗰陣留喺主頁收藏 tab（hash「${hash}」）`);
    const pause = await isShown(p.getByRole('button', { name: ROW_PAUSE, exact: true }));
    log(pause, `${label}：播緊嗰行掣變 ⏸`);
    await ctx.close();
};

/** 滑鼠左滑（pointer events，同手指一樣行 useRowSwipe）：由行中間拖向左（右邊係 ▷，撳佢唔會開始拖） */
const swipeRowLeft = async (p, row) => {
    const box = await row.boundingBox();
    const y = box.y + box.height / 2;
    const startX = box.x + box.width / 2;
    await p.mouse.move(startX, y);
    await p.mouse.down();
    await p.mouse.move(startX - box.width * SWIPE_PAST_RATIO, y, { steps: SWIPE_STEPS });
    await p.mouse.up();
};

/** 左滑移除最後一集 → 嗰行冇咗、★ tab 消失、跳返「節目」 */
const checkSwipeRemoveLast = async ({ browser, base, errors, log }, label, viewport) => {
    const { ctx, p } = await newE2EPage(browser, errors, viewport ? { viewport } : {});
    await seedBookmark(ctx);
    await openSavedTab(p, base);
    const card = p.locator('[data-saved-row] > div').first();
    await swipeRowLeft(p, card);
    const gone = await p
        .getByRole('button', { name: ROW_OPEN })
        .waitFor({ state: 'detached', timeout: UI_WAIT_MS })
        .then(() => true)
        .catch(() => false);
    log(gone, `${label}：左滑過四成移除咗嗰集`);
    const tabGone = await savedTab(p)
        .waitFor({ state: 'hidden', timeout: UI_WAIT_MS })
        .then(() => true)
        .catch(() => false);
    log(tabGone, `${label}：冇收藏之後 ★ tab 消失`);
    const shows = p.getByRole('button', { name: '節目', exact: true });
    log((await shows.getAttribute('aria-pressed')) === 'true', `${label}：跳返「節目」tab`);
    await ctx.close();
};

// ---------- 冇收藏、有收聽記錄（_mockups_/qr-transfer ① B / ②） ----------

const RECENT_TAB = '最近收聽';
// 最近收聽最多 10 集（src/selectors/bookmarks.ts RECENT_MAX）；sampleData 最新嘅 12 集，多兩集驗截到 10
const RECENT_MAX = 10;
const LISTENED = SAMPLE_RECORDINGS.slice(-(RECENT_MAX + 2));
// 公子會 17/10 以外最新嗰集：移除最後一個收藏之後仲有收聽記錄
const OTHER_LISTEN = SAMPLE_RECORDINGS.findLast((r) => r.url !== GONGZI.url);
// ☆ 對齊容差（px，subpixel 進位）
const ALIGN_EPSILON = 0.5;
// 好長嘅名（短篇劇名 + 短篇名咁長都夠）：驗 ☆ 唔會被推出去
const LONG_NAME = '芝See菇Bi Family 一個好長好長好長好長好長好長嘅短篇名';
// 窄橫版（手機打橫，src/config/layout.ts SHORT_LANDSCAPE_QUERY：高 ≤ 561）
const LAND = { width: 844, height: 390 };

/** 用戶之前聽過呢啲集（未聽完，越後越新），入主頁之前寫入 localStorage */
const seedProgress = async (ctx, recordings) => {
    const map = Object.fromEntries(
        recordings.map((r, i) => [
            r.url,
            { position: 60, duration: 600, watched: false, updatedAt: 1000 + i },
        ]),
    );
    await ctx.addInitScript(
        ({ key, value }) => {
            if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
        },
        { key: PROGRESS_STORAGE_KEY, value: JSON.stringify(map) },
    );
};

const recentTab = (p) => p.getByRole('button', { name: RECENT_TAB, exact: true });

/** 第三格嘅 icon 邊個著住 */
const tabIconOn = (p) =>
    p.evaluate(() =>
        [...document.querySelectorAll('[data-tab-id="saved"] [data-tab-icon]')]
            .filter((el) => el.dataset.on === 'true')
            .map((el) => el.dataset.tabIcon),
    );

/**
 * 每行 ☆ 闊度一樣、貼住嗰行右邊（即係每欄 ☆ 上下對齊），而且冇出咗行外面。
 * 第一行個名先換做好長嘅字（用戶報過長名嗰行 ☆ 被推出右邊），sampleData 冇咁長嘅名
 */
const starsAligned = (region) =>
    region.evaluate(
        (el, { epsilon, longName }) => {
            const rows = [...el.querySelectorAll('li')];
            // 行入面：開啟掣 > [碟, 文字 > [名, 日期]]
            const firstName = rows[0]?.querySelector('button > span:nth-child(2) > span');
            if (firstName) firstName.textContent = longName;
            const stars = rows.map((row) => {
                const r = row.getBoundingClientRect();
                const s = row.querySelector('button[aria-label^="收藏 "]').getBoundingClientRect();
                return { gap: r.right - s.right, width: s.width };
            });
            const same = (values) => Math.max(...values) - Math.min(...values) <= epsilon;
            return {
                rows: rows.length,
                ok: same(stars.map((s) => s.gap)) && same(stars.map((s) => s.width)),
                stars,
            };
        },
        { epsilon: ALIGN_EPSILON, longName: LONG_NAME },
    );

/** B：第三格係歷史 icon「最近收聽」；撳入去成個 tab 係清單（最多 10 集）、☆ 對齊、冇收藏 box */
const checkRecentOnly = async ({ browser, base, errors, log }, label, viewport) => {
    const { ctx, p } = await newE2EPage(browser, errors, viewport ? { viewport } : {});
    await seedProgress(ctx, LISTENED);
    await p.goto(base);
    log(await isShown(recentTab(p), { timeout: UI_WAIT_MS }), `${label}：第三格叫「最近收聽」`);
    const icons = await tabIconOn(p);
    log(icons.join() === 'history', `${label}：第三格著住歷史 icon（${icons.join() || '冇'}）`);
    await recentTab(p).click();
    const region = p.getByRole('region', { name: RECENT_TAB });
    await region.waitFor({ timeout: UI_WAIT_MS });
    log((await region.getAttribute('data-fill')) === 'true', `${label}：最近收聽佔滿 tab 區`);
    const boxes = await p.locator('[data-saved-box]').count();
    log(boxes === 0, `${label}：冇收藏 box（${boxes}）`);
    const aligned = await starsAligned(region);
    log(aligned.rows === RECENT_MAX, `${label}：清單最多 ${RECENT_MAX} 集（${aligned.rows}）`);
    log(aligned.ok, `${label}：每行 ☆ 上下對齊（${JSON.stringify(aligned.stars.slice(0, 3))}…）`);
    await ctx.close();
};

/** A → B：有收聽記錄時左滑移除最後一個收藏，tab 留喺第三格、變最近收聽，唔跳返節目 */
const checkRemoveLastKeepsRecent = async ({ browser, base, errors, log }, label, viewport) => {
    const { ctx, p } = await newE2EPage(browser, errors, viewport ? { viewport } : {});
    await seedBookmark(ctx);
    await seedProgress(ctx, [OTHER_LISTEN]);
    await openSavedTab(p, base);
    await swipeRowLeft(p, p.locator('[data-saved-row] > div').first());
    const stayed = await isShown(recentTab(p), { timeout: UI_WAIT_MS });
    log(stayed, `${label}：移除最後一個收藏之後第三格變「最近收聽」`);
    log(
        (await recentTab(p).getAttribute('aria-pressed')) === 'true',
        `${label}：仲揀住第三格，冇跳返「節目」`,
    );
    const list = await isShown(p.getByRole('region', { name: RECENT_TAB }), {
        timeout: UI_WAIT_MS,
    });
    log(list, `${label}：內容換咗做最近收聽清單`);
    await ctx.close();
};

const RECENT_LAYOUTS = [
    ['手機直版', undefined],
    ['窄橫版', LAND],
    ['闊橫版', WIDE],
];

const RECENT_CHECKS = [
    ['冇收藏有記錄 = 最近收聽 tab', checkRecentOnly],
    ['移除最後收藏 → 最近收聽', checkRemoveLastKeepsRecent],
];

const LAYOUTS = [
    ['手機直版', undefined],
    ['闊橫版', WIDE],
];

const CHECKS = [
    ['清單收藏 → ★ tab', checkAddFromList],
    ['撳行入頁唔播', checkOpenWithoutPlaying],
    ['▷ 原地播', checkPlayInPlace],
    ['左滑移除最後一集', checkSwipeRemoveLast],
];

/** 每個版面 × 每個情境一個 section（中途 throw 只會中止嗰個） */
export const runBookmarkChecks = async (env) => {
    for (const [layout, viewport] of LAYOUTS) {
        for (const [name, check] of CHECKS) {
            const label = `收藏 ${layout}：${name}`;
            await runSection(env.log, label, () => check(env, label, viewport), env.browser);
        }
    }
    for (const [layout, viewport] of RECENT_LAYOUTS) {
        for (const [name, check] of RECENT_CHECKS) {
            const label = `收藏 ${layout}：${name}`;
            await runSection(env.log, label, () => check(env, label, viewport), env.browser);
        }
    }
};
