// v1.28 → v1.29 升級 e2e（Phase −1）：用戶舊版用音檔 URL 做 key 嘅進度（progress:v1）同收藏
// （bookmarks:v1，冇 id）喺開 app 之前已經喺 localStorage；開 app 之後 src/services/storageMigration.ts
// 要搬去 v2（episode ID key），收藏 tab 照出返嗰兩集、已收聽 / 聽到幾耐都喺度，v1 原封不動。
// 預期字眼刻意寫死做獨立對照（src/i18n/zh-HK.ts common.status.* / bookmark.*）
import { isShown, newE2EPage, runSection } from './harness.mjs';
import { SAMPLE_RECORDINGS } from './sampleData.mjs';

/** 同 src/config/constants.ts PROGRESS_V1_STORAGE_KEY / BOOKMARK_V1_STORAGE_KEY 一樣（舊版 key，刻意寫死） */
const PROGRESS_V1_KEY = '903player:progress:v1';
const BOOKMARK_V1_KEY = '903player:bookmarks:v1';
const PROGRESS_V2_KEY = '903player:progress:v2';
const BOOKMARK_V2_KEY = '903player:bookmarks:v2';

const SAVED_TAB = '我的收藏';
const UI_WAIT_MS = 5000;
// 公子會（星期六）兩集：21/11 聽完、14/11 聽到 2:00 / 20:00
const gongzi = (date) => SAMPLE_RECORDINGS.find((r) => r.showId === 'gongzi' && r.date === date);
const WATCHED = gongzi('2026-11-21');
const PARTIAL = gongzi('2026-11-14');
const PARTIAL_POSITION = 120;
const PARTIAL_DURATION = 1200;
const WATCHED_ROW = /^開啟 公子會 21\/11 星期六/;
const PARTIAL_ROW = /^開啟 公子會 14\/11 星期六/;

/** 舊版（v1.28）嘅 localStorage：key = 音檔 URL；收藏冇 id */
const V1_PROGRESS = {
    [WATCHED.url]: { position: 1190, duration: PARTIAL_DURATION, watched: true, updatedAt: 2 },
    [PARTIAL.url]: {
        position: PARTIAL_POSITION,
        duration: PARTIAL_DURATION,
        watched: false,
        updatedAt: 1,
    },
};
const v1Bookmark = (r, addedAt) => ({
    kind: 'show',
    url: r.url,
    showId: r.showId,
    date: r.date,
    time: r.time,
    addedAt,
});
const V1_BOOKMARKS = { version: 1, items: [v1Bookmark(WATCHED, 1), v1Bookmark(PARTIAL, 2)] };

/** 第一次載入先寫（reload 唔好覆蓋 app 自己寫嘅嘢） */
const seedV1 = (ctx) =>
    ctx.addInitScript(
        (entries) =>
            entries.forEach(([key, value]) => {
                if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
            }),
        [
            [PROGRESS_V1_KEY, JSON.stringify(V1_PROGRESS)],
            [BOOKMARK_V1_KEY, JSON.stringify(V1_BOOKMARKS)],
        ],
    );

const readStorage = (p) =>
    p.evaluate(
        (keys) => keys.map((key) => localStorage.getItem(key)),
        [PROGRESS_V1_KEY, BOOKMARK_V1_KEY, PROGRESS_V2_KEY, BOOKMARK_V2_KEY],
    );

/** 收藏 tab 嗰行（開啟掣）入面嘅字 */
const rowText = (p, name) => p.getByRole('button', { name }).first().textContent();

/** 主頁出 ★ tab、兩集都喺收藏 tab，狀態跟舊進度 */
const checkSavedTab = async (p, label, log) => {
    const tab = p.getByRole('button', { name: SAVED_TAB, exact: true });
    log(await isShown(tab, { timeout: UI_WAIT_MS }), `${label}：舊收藏搬咗，主頁出 ★ tab`);
    await tab.click();
    await p.getByRole('region', { name: SAVED_TAB }).waitFor({ timeout: UI_WAIT_MS });
    const watched = await rowText(p, WATCHED_ROW);
    log(watched.includes('已收聽'), `${label}：21/11 仍然顯示已收聽（${watched}）`);
    const partial = await rowText(p, PARTIAL_ROW);
    log(partial.includes('聽到 2:00 / 20:00'), `${label}：14/11 仍然記得聽到邊（${partial}）`);
};

/** v2 用 episode ID 做 key；v1 一個 byte 都冇改（rollback 用） */
const checkStorage = async (p, label, log) => {
    const [progressV1, bookmarksV1, progressV2, bookmarksV2] = await readStorage(p);
    const ids = Object.keys(JSON.parse(progressV2 ?? '{}')).sort();
    log(
        ids.includes(WATCHED.id) && ids.includes(PARTIAL.id),
        `${label}：進度搬去 v2，key 係 episode ID（${ids.join('、')}）`,
    );
    const saved = (JSON.parse(bookmarksV2 ?? '{}').items ?? []).map((b) => b.id);
    log(
        saved.includes(WATCHED.id) && saved.includes(PARTIAL.id),
        `${label}：收藏搬去 v2，每條有 id（${saved.join('、')}）`,
    );
    log(
        progressV1 === JSON.stringify(V1_PROGRESS) && bookmarksV1 === JSON.stringify(V1_BOOKMARKS),
        `${label}：v1 原封不動`,
    );
};

const checkUpgrade = async ({ browser, base, errors, log }) => {
    const label = 'v1 → v2 升級';
    const { ctx, p } = await newE2EPage(browser, errors);
    await seedV1(ctx);
    await p.goto(base);
    await checkSavedTab(p, label, log);
    await checkStorage(p, label, log);
    // 再開一次（migration 每次開 app 都跑）：唔會重複、唔會覆蓋
    await p.reload();
    await checkSavedTab(p, `${label}（再開 app）`, log);
    const [, , , bookmarksV2] = await readStorage(p);
    const count = (JSON.parse(bookmarksV2 ?? '{}').items ?? []).length;
    log(count === V1_BOOKMARKS.items.length, `${label}：再開 app 收藏冇重複（${count} 條）`);
    await ctx.close();
};

export const runStorageMigrationChecks = (env) =>
    runSection(env.log, '舊版進度 / 收藏升級', () => checkUpgrade(env), env.browser);
