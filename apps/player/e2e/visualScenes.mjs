// 截圖比對（visualDiff.mjs）影嘅情境：每個情境喺每個凍結 viewport（visualModel.mjs）各影一張。
// 所有情境停喺唔會自己郁嘅狀態（暫停 + 跳去固定時間），兩個 build 先可以逐 pixel 比。
import { BOOKMARK_STORAGE_KEY, BOOKMARK_STORE_VERSION } from './bookmark.mjs';
import { SERIES_ROUTE } from './dramaPages.mjs';
import { buildCatalogDocument } from '../scripts/buildCatalogJson.mjs';
import {
    E2E_CATALOG_GLOB,
    ensurePlaying,
    isShown,
    serveWav,
    waitForPlaybackState,
} from './harness.mjs';
import { PROGRESS_STORAGE_KEY } from './hiddenPlayback.mjs';
import { CATALOG_DIR, CATALOG_FOLDER, catalogRoute } from './remoteCatalog.mjs';
import { SAMPLE_RECORDINGS } from './sampleData.mjs';
import { VISUAL_DAY_NOW, dayScenes } from './visualModel.mjs';

// 星期日：假錄音（sampleData.mjs）冇節目，主頁冇 mini player（同 homeWide.mjs 一樣）
const E2E_SUNDAY = '2026-11-29T22:30:00+08:00';
const SHOW_ROUTE = '#/show/gongzi';
const TODAY_ROUTE = '#/today';
// 每日劇集（kind: daily）：library 得 18 樓 C 座一套，而且 enabled: false（內建資料入唔到，會出「找不到此廣播劇」）。
// 用 runtime catalog.json 開返佢（同 remoteCatalog.mjs 一樣嘅 route），先影到每日劇集頁（W-781）
const DAILY_ID = 'c18';
const DAILY_NAME = '18 樓 C 座';
const DAILY_ROUTE = `#/drama/${DAILY_ID}`;
// 每日劇集嘅音檔（<folder>/<yyyymmdd>.m4a）：harness 冇呢啲檔，答靜音 WAV 先可以暫停喺固定時間
const DAILY_AUDIO_GLOB = `**/${DAILY_ID}/*.m4a`;
const HOME_ROUTE = '#/';
// 暫停之後跳去呢個時間：進度圈、「聽到 1:00」每次一樣
const PAUSED_AT_SECONDS = 60;
// 等 UI 反應（轉頁、sheet、tab 過場）最多幾耐
const UI_WAIT_MS = 5000;
// 收藏 / 最近收聽嘅假資料：最新幾集（夠出捲動）
const LISTENED = SAMPLE_RECORDINGS.slice(-6);
const SAVED = SAMPLE_RECORDINGS.slice(-3);

const seedStorage = (ctx, key, value) =>
    ctx.addInitScript(
        (entry) => {
            if (localStorage.getItem(entry.key) === null)
                localStorage.setItem(entry.key, entry.value);
        },
        { key, value: JSON.stringify(value) },
    );

const seedSaved = async (ctx) => {
    const items = SAVED.map((r, i) => ({
        kind: 'show',
        id: r.id,
        url: r.url,
        showId: r.showId,
        date: r.date,
        time: r.time,
        addedAt: i + 1,
    }));
    await seedStorage(ctx, BOOKMARK_STORAGE_KEY, { version: BOOKMARK_STORE_VERSION, items });
    const progress = Object.fromEntries(
        LISTENED.map((r, i) => [
            r.id,
            { position: PAUSED_AT_SECONDS, duration: 600, watched: false, updatedAt: 1000 + i },
        ]),
    );
    await seedStorage(ctx, PROGRESS_STORAGE_KEY, progress);
};

/** catalog.json 同內建資料一樣，淨係開返每日劇集；兩個 build 都食同一份（由而家嘅 source 生成） */
const seedDailyCatalog = async (ctx, base) => {
    const imageBase = new URL(CATALOG_FOLDER, base).pathname;
    const doc = buildCatalogDocument({ catalogDir: CATALOG_DIR.pathname, imageBase });
    const dramas = doc.dramas.map((drama) =>
        drama.id === DAILY_ID
            ? { ...drama, definition: { ...drama.definition, enabled: true } }
            : drama,
    );
    if (!dramas.some((drama) => drama.id === DAILY_ID)) throw new Error(`catalog 冇 ${DAILY_ID}`);
    const catalogBody = JSON.stringify({ ...doc, dramas });
    await ctx.route(
        E2E_CATALOG_GLOB,
        catalogRoute({ catalogBody, allowOrigin: new URL(base).origin }),
    );
    await ctx.route(DAILY_AUDIO_GLOB, (route) => serveWav(route));
    await captureAudio(ctx);
};

/** app 自己 new 嘅 <audio> 唔喺 DOM：攔 play() 記低佢，之後先可以跳去固定時間 */
const captureAudio = (ctx) =>
    ctx.addInitScript(() => {
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function capturePlay(...args) {
            window.__e2eAudio = this;
            return play.apply(this, args);
        };
    });

const openHome = async (p, base) => {
    await p.goto(base);
    await p.locator('nav[aria-busy="false"]').waitFor({ timeout: UI_WAIT_MS });
};

/** 撳分類掣，等佢真係揀中（aria-pressed）先算到位 */
const openTab = async (p, base, name) => {
    await openHome(p, base);
    const tab = p.getByRole('button', { name, exact: true }).first();
    await tab.click();
    await p
        .getByRole('button', { name, exact: true, pressed: true })
        .first()
        .waitFor({ timeout: UI_WAIT_MS });
};

/** 入頁（會自動播）→ 暫停 → 跳去固定時間，等畫面跟上 */
const openPaused = async (p, base, route) => {
    await p.goto(`${base}${route}`);
    await ensurePlaying(p);
    await p.getByRole('button', { name: '暫停', exact: true }).first().click();
    await waitForPlaybackState(p, 'paused');
    await p.evaluate((seconds) => {
        window.__e2eAudio.currentTime = seconds;
    }, PAUSED_AT_SECONDS);
    await p.waitForFunction(
        (seconds) => window.__e2eAudio.currentTime === seconds && !window.__e2eAudio.seeking,
        PAUSED_AT_SECONDS,
        { timeout: UI_WAIT_MS },
    );
};

const arcSheet = (p) => p.getByRole('dialog', { name: '全集' });

/** 第一次入短篇劇集頁，全集表會自己彈出 */
const openSeries = async (p, base) => {
    await p.goto(`${base}${SERIES_ROUTE}`);
    if (!(await isShown(arcSheet(p), { timeout: UI_WAIT_MS }))) {
        throw new Error('全集表冇自己彈出');
    }
};

/**
 * 情境清單。seed(ctx, base)：開頁前嘅準備（localStorage、init script）；now：時鐘起點（預設 harness E2E_NOW）；
 * run(p, base)：去到要影嘅畫面
 */
const NIGHT_SCENES = [
    { id: 'home-shows', run: openHome },
    { id: 'home-idle', now: E2E_SUNDAY, run: openHome },
    { id: 'home-dramas', run: (p, base) => openTab(p, base, '廣播劇') },
    { id: 'home-saved', seed: seedSaved, run: (p, base) => openTab(p, base, '我的收藏') },
    {
        id: 'home-paused',
        seed: captureAudio,
        run: async (p, base) => {
            await openPaused(p, base, SHOW_ROUTE);
            await p.goto(`${base}${HOME_ROUTE}`);
            await p.locator('nav[aria-busy="false"]').waitFor({ timeout: UI_WAIT_MS });
        },
    },
    { id: 'show', seed: captureAudio, run: (p, base) => openPaused(p, base, SHOW_ROUTE) },
    { id: 'today', seed: captureAudio, run: (p, base) => openPaused(p, base, TODAY_ROUTE) },
    { id: 'drama-series-sheet', run: openSeries },
    {
        id: 'drama-series',
        run: async (p, base) => {
            await openSeries(p, base);
            await p.keyboard.press('Escape');
            await arcSheet(p).waitFor({ state: 'detached', timeout: UI_WAIT_MS });
        },
    },
    {
        id: 'drama-daily',
        seed: seedDailyCatalog,
        run: async (p, base) => {
            await openPaused(p, base, DAILY_ROUTE);
            await p
                .getByRole('heading', { name: DAILY_NAME })
                .first()
                .waitFor({ timeout: UI_WAIT_MS });
        },
    },
];

/**
 * 日間版（14:00，同一日）：睡眠 timer 月亮掣淨係喺裝置本地 21:00–05:00 出（9d），
 * 呢幾個有播放器嘅畫面喺日間要同改之前一模一樣
 */
const DAY_SCENE_IDS = ['home-paused', 'show', 'today'];

export const VISUAL_SCENES = [
    ...NIGHT_SCENES,
    ...dayScenes(NIGHT_SCENES, DAY_SCENE_IDS, VISUAL_DAY_NOW),
];
