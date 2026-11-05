// 即將上架 / 快將下架 e2e（P8 #6，_mockups_/coming-soon）：用 e2e/fixtures/dramas 嘅測試劇
// （e2e build 先編入，context 寫 E2E_FIXTURES_KEY 先出），時鐘 E2E_NOW = 30/11（一）。
// 預期字眼刻意寫死做獨立對照（src/i18n/zh-HK.ts availability.*）
import { BOOKMARK_STORAGE_KEY, BOOKMARK_STORE_VERSION } from './bookmark.mjs';
import { DRAMA_AUDIO_BASE, isShown, newE2EPage, reachesHash } from './harness.mjs';
import { PROGRESS_STORAGE_KEY } from './hiddenPlayback.mjs';

/** 同 src/catalog/dramas/lib/e2eFixtures.ts 一樣（src/e2eSrcConstants.test.ts 鎖住） */
export const E2E_FIXTURES_KEY = '903player:e2e:dramas';

const WAIT_MS = 5000;
// 撳咗撳唔到嘅格之後等幾耐：會轉頁嘅話呢段時間內已經轉咗
const NO_NAVIGATION_WAIT_MS = 1500;
// 撳灰格離格底幾多 px（底部深色條嗰度，唔會撳中上面蓋住佢嘅卡）
const TILE_BOTTOM_TAP_PX = 10;
const TALL_PHONE = { width: 390, height: 1400 };
const SHELF = '廣播劇';
const SAVED_TAB = '我的收藏';

/** 測試劇集數嘅網址：同 app 一樣 <R2>/<folder>/<短篇>/<集數兩位>.m4a（fixture template {no2}.m4a） */
const episodeUrl = (arc, no) =>
    `${DRAMA_AUDIO_BASE}/e2e/${encodeURIComponent(arc)}/${String(no).padStart(2, '0')}.m4a`;

const series = (dramaId, arc, no) => ({
    kind: 'series',
    url: episodeUrl(arc, no),
    dramaId,
    arc,
    no,
    addedAt: 1,
});

/** 收藏：已下架劇第 1 集、集數已下架（我心不死第 1 集）、快將下架（我心不死第 3 集，明日） */
const BOOKMARKS = [
    series('e2e-gone', '戀愛二分一', 1),
    series('e2e-soon', '我心不死', 1),
    series('e2e-soon', '我心不死', 3),
];
/** 聽過初戀無限次第 2 集（短篇 19/12 下架）：主頁繼續收聽 LC2、最近收聽 LR1 */
const HEARD = episodeUrl('初戀無限次', 2);

/**
 * 另外聽過嘅集（覆蓋預設）：我心不死第 3 集（01/12 下架，同左上角 19/12 唔同日 → 繼續收聽條照出）、
 * 下架劇場第 1 集（同成套劇同日 19/12 → 繼續收聽條唔再出）
 */
const LEAVING_PROGRESS = {
    [episodeUrl('我心不死', 3)]: { position: 60, duration: 600, watched: false, updatedAt: 3 },
    [episodeUrl('戀愛二分一', 1)]: { position: 60, duration: 600, watched: false, updatedAt: 2 },
};

const seedStorage = (ctx, extraProgress = {}) =>
    ctx.addInitScript(
        ({ flagKey, bookmarkKey, bookmarks, progressKey, progress }) => {
            localStorage.setItem(flagKey, '1');
            if (localStorage.getItem(bookmarkKey) === null)
                localStorage.setItem(bookmarkKey, bookmarks);
            if (localStorage.getItem(progressKey) === null)
                localStorage.setItem(progressKey, progress);
        },
        {
            flagKey: E2E_FIXTURES_KEY,
            bookmarkKey: BOOKMARK_STORAGE_KEY,
            bookmarks: JSON.stringify({ version: BOOKMARK_STORE_VERSION, items: BOOKMARKS }),
            progressKey: PROGRESS_STORAGE_KEY,
            progress: JSON.stringify({
                [HEARD]: { position: 120, duration: 600, watched: false, updatedAt: 1 },
                ...extraProgress,
            }),
        },
    );

const openPage = async (env, options = {}, extraProgress = {}) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, options);
    await seedStorage(ctx, extraProgress);
    return { ctx, p };
};

const labelsIn = (scope) =>
    scope
        .getByRole('button')
        .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));

/** 疊卡入面而家 focus 緊嗰張卡嘅讀屏名 */
const focusedTile = (shelf) =>
    shelf.locator('[data-focused] > button').first().getAttribute('aria-label');

/**
 * 直版疊卡：撳新劇灰格（撳佢見到嘅底部條）完全冇反應——唔 focus、唔捲、唔入頁。
 * 灰格排最尾、俾上面嘅卡蓋住上半，所以撳格底
 */
const checkStackedUpcoming = async (env) => {
    const { log } = env;
    // 高身直版：疊卡放得晒唔使捲，灰格底一定喺畫面入面（捲動情況由 unit test 鎖住）
    const { ctx, p } = await openPage(env, { viewport: TALL_PHONE });
    await p.goto(env.base);
    await p.getByRole('button', { name: SHELF, exact: true }).click();
    const shelf = p.getByRole('navigation', { name: SHELF });
    await shelf.waitFor({ timeout: WAIT_MS });
    const before = await focusedTile(shelf);
    const upcoming = shelf.getByRole('button', { name: /^E2E 新劇/ });
    const box = await upcoming.boundingBox();
    const point = box && { x: box.x + box.width / 2, y: box.y + box.height - TILE_BOTTOM_TAP_PX };
    // 撳嗰點真係落喺灰格度（唔係畫面外、唔係其他卡）
    const hits = point
        ? await upcoming.evaluate(
              (el, { x, y }) => el.contains(document.elementFromPoint(x, y)),
              point,
          )
        : false;
    if (point) await p.mouse.click(point.x, point.y);
    await p.waitForTimeout(NO_NAVIGATION_WAIT_MS);
    const after = await focusedTile(shelf);
    log(
        hits && after === before && !new URL(p.url()).hash.startsWith('#/drama'),
        `直版疊卡：撳新劇灰格冇反應（focus ${before} → ${after}，${p.url()}）`,
    );
    await ctx.close();
};

// 讀屏名（F3）：劇名，未上架嗰個；快將下架（讀屏日子 E1：一律「日子 星期幾」）
const SOON_TILE_LABEL = 'E2E 即將劇場，下個短篇 02/12 星期三 上架；部分短篇 19/12 星期六 下架';
/** 主頁格角落字闊橫版 / 窄橫版（有繼續收聽 + 左上角下架字，W-533） */
const RELEASE_VIEWPORTS = [
    { width: 1300, height: 800, full: false },
    { width: 844, height: 390, full: false },
    { width: 390, height: 844, full: true },
];

/**
 * 角落字：字尾嗰截見到、冇俾截、喺格入面；短篇數要麼成段「N 個短篇」出齊（冇俾截），要麼成段收埋，
 * 唔可以出半截或者淨低分隔點（成個角落冇 overflow）
 */
const releaseFit = (tile) =>
    tile.evaluate((button) => {
        const release = button.querySelector('[data-role="meta-release"]');
        const count = button.querySelector('[data-role="meta-count"]');
        const meta = release?.parentElement;
        if (!release || !count || !meta) return null;
        const box = release.getBoundingClientRect();
        const card = button.getBoundingClientRect();
        const shown = [...release.children].filter((el) => getComputedStyle(el).display !== 'none');
        const countShown = getComputedStyle(count).display !== 'none';
        return {
            whole: release.scrollWidth <= release.clientWidth && box.width > 0,
            inside: box.left >= card.left && box.right <= card.right,
            text: shown.map((el) => el.textContent).join(''),
            count: countShown ? count.textContent : null,
            cornerFits: meta.scrollWidth <= meta.clientWidth,
        };
    });

/**
 * 繼續收聽條：集名冇俾截（下架字顯示緊嘅時候）；下架字要麼成段出齊要麼成段收埋
 */
const continueFit = (tile) =>
    tile.evaluate((button) => {
        const line = button.parentElement?.querySelector('[data-continue-line]');
        const name = line?.querySelector('[data-marquee-text]');
        const leaving = line?.querySelector('[data-role="continue-leaving"]');
        if (!line || !name) return null;
        const leavingShown = leaving && getComputedStyle(leaving).display !== 'none';
        const box = name.parentElement?.parentElement;
        return {
            nameWhole: !leavingShown || (box ? name.scrollWidth <= box.clientWidth : false),
            leaving: leavingShown ? leaving.textContent : null,
            leavingWhole: leavingShown ? leaving.scrollWidth <= leaving.clientWidth : true,
        };
    });

/**
 * W-533：有「繼續收聽」+ 左上角下架字嘅格，右上角上架字尾成截睇得到（窄就短版「後日上架」），
 * 讀屏名有長版上架日
 */
const checkReleaseNote = async (env) => {
    const { log } = env;
    for (const { full, ...viewport } of RELEASE_VIEWPORTS) {
        const { ctx, p } = await openPage(env, { viewport }, LEAVING_PROGRESS);
        await p.goto(env.base);
        await p.getByRole('button', { name: SHELF, exact: true }).click();
        const tile = p.getByRole('button', { name: SOON_TILE_LABEL });
        const fit = (await isShown(tile, { timeout: WAIT_MS })) ? await releaseFit(tile) : null;
        const expected = full ? '新短篇 後日上架' : '後日上架';
        log(
            fit !== null && fit.whole && fit.inside && fit.text === expected,
            `${viewport.width}×${viewport.height} 主頁：上架字尾冇俾截（${JSON.stringify(fit)}）`,
        );
        log(
            fit !== null && fit.cornerFits && (fit.count === null || fit.count === '3 個短篇 · '),
            `${viewport.width}×${viewport.height} 主頁：短篇數成段出齊或者成段收埋（${fit?.count ?? '收埋'}）`,
        );
        const strip = (await isShown(tile, { timeout: WAIT_MS })) ? await continueFit(tile) : null;
        log(
            strip !== null && strip.nameWhole && (strip.leaving === null || strip.leavingWhole),
            `${viewport.width}×${viewport.height} 主頁：繼續收聽集名完整，下架字要麼完整要麼冇（${JSON.stringify(strip)}）`,
        );
        await ctx.close();
    }
};

/** 主頁劇集格：H2 字尾、左上角琥珀、LC2、新劇灰格排最尾、已下架劇唔出 */
const checkHomeShelf = async (env) => {
    const { log } = env;
    const viewport = { width: 1024, height: 768 };
    const { ctx, p } = await openPage(env, { viewport }, LEAVING_PROGRESS);
    await p.goto(env.base);
    await p.getByRole('button', { name: SHELF, exact: true }).click();
    const shelf = p.getByRole('navigation', { name: SHELF });
    await shelf.waitFor({ timeout: WAIT_MS });
    const labels = await labelsIn(shelf);
    log(
        labels.includes(SOON_TILE_LABEL),
        '主頁：即將劇場讀「下個短篇 02/12 星期三 上架；部分短篇 19/12 星期六 下架」',
    );
    log(
        labels.includes('E2E 下架劇場，本廣播劇系列 19/12 星期六 下架'),
        '主頁：成套劇快將下架讀「本廣播劇系列 19/12 星期六 下架」',
    );
    log(!labels.some((l) => l.startsWith('E2E 舊劇場')), '主頁：已下架嘅劇唔出');
    log(
        labels.at(-1) === 'E2E 新劇，15/12 星期二 上架',
        `主頁：整套新劇排最尾（${labels.at(-1)}）`,
    );
    log(
        labels.includes('E2E 即將劇場，繼續收聽 我心不死 · 第 3 集，01/12 星期二 下架'),
        '主頁：繼續收聽嗰集同左上角唔同日落架，條上照加下架日（LC2）',
    );
    log(
        labels.includes('E2E 下架劇場，繼續收聽 戀愛二分一 · 第 1 集') &&
            !(await shelf.locator('[data-role="continue-leaving"]').allTextContents()).some((t) =>
                t.includes('19/12'),
            ),
        '主頁：繼續收聽嗰集同成套劇同日落架，淨係左上角講（條上冇下架字）',
    );
    const upcoming = shelf.getByRole('button', { name: /^E2E 新劇/ });
    log(
        (await upcoming.getAttribute('aria-disabled')) === 'true' &&
            (await upcoming.textContent())?.includes('即將上架 · 15/12'),
        '主頁：新劇灰格 aria-disabled，寫「即將上架 · 15/12」',
    );
    await upcoming.click({ force: true });
    await p.waitForTimeout(NO_NAVIGATION_WAIT_MS);
    log(!new URL(p.url()).hash.startsWith('#/drama'), `主頁：撳新劇灰格唔入劇集頁（${p.url()}）`);
    await ctx.close();
};

const chipsOf = (p) => p.getByRole('group', { name: '短篇' });

/** 劇集頁 chips：即將上架排最尾撳唔到；LK1；撳唔到嘅 chip 唔會揀中 */
const checkDramaChips = async (env, p) => {
    const { log } = env;
    const chips = await labelsIn(chipsOf(p));
    log(
        chips.slice(-2).join(' | ') === 'XXX，02/12 星期三 上架 | YYY，14/12 星期一 上架',
        `劇集頁：即將上架 chips 排最尾（${chips.slice(-2).join(' | ')}）`,
    );
    log(
        chips.includes('初戀無限次，19/12 星期六 下架'),
        '劇集頁：快將下架短篇 chip 讀下架日（LK1）',
    );
    const soon = chipsOf(p).getByRole('button', { name: /^XXX，/ });
    await soon.click({ force: true });
    log(
        (await soon.getAttribute('aria-disabled')) === 'true' &&
            (await soon.getAttribute('aria-pressed')) === null,
        '劇集頁：撳即將上架 chip 乜都唔做（aria-disabled、唔揀中）',
    );
};

/** 全集一覽表：S1 最底組、A2、LS2 */
const checkSheet = async (env, p) => {
    const { log } = env;
    await chipsOf(p).getByRole('button', { name: '全集' }).click();
    const sheet = p.getByRole('dialog', { name: '全集' });
    await sheet.waitFor({ timeout: WAIT_MS });
    const groups = await sheet.getByRole('heading', { level: 3 }).allTextContents();
    log(groups.at(-1) === '即將上架', `一覽表：最底一組係即將上架（${groups.join(' / ')}）`);
    const xxx = sheet.getByRole('button', { name: 'XXX，02/12 星期三 上架，20 集' });
    log(
        (await xxx.textContent())?.includes('後日上架 · 20 集'),
        '一覽表：XXX 第二行「後日上架 · 20 集」',
    );
    const yyy = sheet.getByRole('button', { name: 'YYY，14/12 星期一 上架' });
    log((await yyy.textContent())?.endsWith('14/12（一）上架'), '一覽表：未知集數嘅 YYY 唔寫集數');
    const half = await sheet.getByRole('button', { name: /^戀愛二分一，/ }).textContent();
    log(
        half?.includes('0/30') && half.includes('第 11 集起 03/12 上架'),
        `一覽表：逐集上架 A2（${half}）`,
    );
    const firstRow = sheet.getByRole('button', { name: /^初戀無限次，/ });
    const first = await firstRow.textContent();
    log(first?.includes('快將下架') && first.includes('19/12 下架'), `一覽表：LS2（${first}）`);
    // F2：讀屏逐段砌、冇「·」、唔重覆「快將下架」
    const firstName = (await firstRow.getAttribute('aria-label')) ?? '';
    log(
        /^初戀無限次，.+，\d+ 集，19\/12 星期六 下架$/.test(firstName) &&
            !firstName.includes('·') &&
            !firstName.includes('快將下架'),
        `一覽表：快將下架行讀屏名（F2：${firstName}）`,
    );
    await p.keyboard.press('Escape');
    await sheet.waitFor({ state: 'detached', timeout: WAIT_MS });
};

/** 集數清單：未上架批次摺埋一行（撳唔到）；LE1 */
const checkEpisodeList = async (env, p) => {
    const { log } = env;
    await chipsOf(p).getByRole('button', { name: '戀愛二分一', exact: true }).click();
    const list = p.getByRole('region', { name: '集數' });
    const batch = list.getByRole('button', { name: '第 11 至 20 集，03/12 星期四 上架' });
    log(await isShown(batch, { timeout: WAIT_MS }), '清單：第 11 至 20 集摺埋一行');
    log((await batch.getAttribute('aria-disabled')) === 'true', '清單：摺埋行 aria-disabled');
    log((await list.getByText('共 30 集').count()) === 1, '清單：「共 30 集」計埋未上架');
    await chipsOf(p).getByRole('button', { name: '我心不死', exact: true }).click();
    const rows = await labelsIn(list);
    log(!rows.some((l) => /第 1 集|第 2 集/.test(l)), '清單：已下架嘅第 1、2 集唔出');
    log(
        rows.some((l) => l.startsWith('播放 第 3 集') && l.includes('01/12 星期二 下架')),
        '清單：第 3 集讀「01/12 星期二 下架」（LE1）',
    );
};

const checkDramaPage = async (env) => {
    const { ctx, p } = await openPage(env);
    await p.goto(`${env.base}#/drama/e2e-soon`);
    await chipsOf(p).waitFor({ timeout: WAIT_MS });
    await checkDramaChips(env, p);
    await checkSheet(env, p);
    await checkEpisodeList(env, p);
    await ctx.close();
};

/** 成套劇快將下架：一覽表表頭下面 + 唱片下面嗰行（未聽過取代「揀一個短篇開始收聽」） */
const checkLeavingDrama = async (env) => {
    const { log } = env;
    const { ctx, p } = await openPage(env);
    await p.goto(`${env.base}#/drama/e2e-leaving`);
    const sheet = p.getByRole('dialog', { name: '全集' });
    await sheet.waitFor({ timeout: WAIT_MS });
    log(
        await isShown(sheet.getByText('本廣播劇系列 19/12（六）下架')),
        '一覽表：表頭下面「本廣播劇系列 19/12（六）下架」',
    );
    await p.keyboard.press('Escape');
    await sheet.waitFor({ state: 'detached', timeout: WAIT_MS });
    log(
        (await p.getByText('本廣播劇系列 19/12（六）下架').count()) === 1 &&
            (await p.getByText('揀一個短篇開始收聽').count()) === 0,
        '劇集頁：唱片下面改講「本廣播劇系列 19/12（六）下架」',
    );
    await ctx.close();
};

/** 舊劇集頁 URL：已下架 → 返主頁 + 提示；即將上架 → 返主頁 */
const checkOffShelfUrls = async (env) => {
    const { log } = env;
    const { ctx, p } = await openPage(env);
    await p.goto(`${env.base}#/drama/e2e-gone`);
    log(await reachesHash(p, '#/'), '已下架劇集頁 URL 返主頁');
    log(
        await isShown(p.getByRole('status').getByText('本廣播劇系列已下架')),
        '已下架：Toast「本廣播劇系列已下架」',
    );
    await p.goto(`${env.base}#/drama/e2e-upcoming`);
    log(await reachesHash(p, '#/'), '即將上架劇集頁 URL 返主頁');
    await ctx.close();
};

/** 收藏 tab：已下架灰行（冇 ▷、撳唔到、Delete 移除）；LB1；最近收聽 LR1 */
const checkSavedTab = async (env) => {
    const { log } = env;
    const { ctx, p } = await openPage(env, { reducedMotion: 'reduce' });
    await p.goto(env.base);
    await p.getByRole('button', { name: SAVED_TAB, exact: true }).click({ timeout: WAIT_MS });
    const saved = p.getByRole('region', { name: SAVED_TAB });
    await saved.waitFor({ timeout: WAIT_MS });
    const gone = saved.getByRole('button', {
        name: 'E2E 舊劇場 · 戀愛二分一 第 1 集，已下架',
    });
    log((await gone.getAttribute('aria-disabled')) === 'true', '收藏 tab：已下架行 aria-disabled');
    log(
        (await saved.getByRole('button', { name: /^播放 E2E 舊劇場/ }).count()) === 0,
        '收藏 tab：已下架行冇播放掣',
    );
    const leaving = await labelsIn(saved);
    log(
        leaving.some(
            (l) =>
                l.startsWith('開啟 E2E 即將劇場 · 我心不死 第 3 集') &&
                l.includes('01/12 星期二 下架'),
        ),
        '收藏 tab：快將下架行讀下架日（LB1）',
    );
    log(
        leaving.some(
            (l) =>
                l.startsWith('開啟 E2E 即將劇場 初戀無限次 · 第 2 集') &&
                l.includes('19/12 星期六 下架'),
        ),
        '最近收聽：快將下架行第二行（LR1）',
    );
    await gone.focus();
    await p.keyboard.press('Delete');
    log(
        await isShown(gone, { state: 'detached', timeout: WAIT_MS }),
        '收藏 tab：已下架行撳 Delete 移除',
    );
    await ctx.close();
};

/** 即將上架 / 快將下架（P8 #6） */
export const runComingSoonChecks = async (env) => {
    await checkHomeShelf(env);
    await checkStackedUpcoming(env);
    await checkReleaseNote(env);
    await checkDramaPage(env);
    await checkLeavingDrama(env);
    await checkOffShelfUrls(env);
    await checkSavedTab(env);
};
