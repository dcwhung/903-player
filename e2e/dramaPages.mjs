// 廣播劇 e2e：主頁劇集書架次序（S-482）、短篇劇集頁第一次入（冇進度）嘅黑碟同冇「由頭播放」
// （S-485、v1.19.3 CUI-0006）。黑碟色要喺真瀏覽器量 computed style：jsdom 計唔到 CSS 顏色
import { isShown, newE2EPage, succeeds } from './harness.mjs';

// 主頁「廣播劇」書架次序（按上架日，新嘅先；src/dramas/*/drama.json）；刻意寫死做獨立對照
const SHELF_ORDER = ['蘭茜夫人劇場', '少爺占系列', '森美小儀系列', '芝See菇Bi Family', '黃金少年'];
// 劇集格讀屏名有新嘢會加「，有新短篇」等（drama.tileNew），比較劇名時去走
const tileName = (label) => label.split('，')[0];
// 短篇劇集（kind: series）：第一次入頁冇進度
export const SERIES_ROUTE = '#/drama/chisee';
// 星期二：平日有節目，但假錄音最後一日係 19/10，20/10 全部未上架 → 今日節目頁顯示 TodayEmpty
const E2E_TUESDAY_NOT_UPLOADED = '2026-10-20T22:30:00+08:00';
const TODAY_EMPTY_TITLE = '今日節目未上架';
// 冇圖黑碟：tokens.css --color-disc-blank（#0a0a0a）；刻意寫死做獨立對照
const BLANK_DISC_BG = 'rgb(10, 10, 10)';
const RESTART = '由頭播放';
// 播放器嘅大唱片（Disc size="large"）；清單 / mini player 嘅細碟唔係
const LARGE_DISC = '[class*="disc"][class*="large"]';

// 等元素 / 量唱片最多咁耐
const WAIT_MS = 5000;

/** 大唱片嘅樣：底色、碟邊（box-shadow）、有冇節目圖；搵唔到唱片就 null（交畀斷言 log，唔 throw） */
const discLook = (scope) =>
    scope
        .locator(LARGE_DISC)
        .first()
        .evaluate(
            (el) => {
                const style = getComputedStyle(el);
                return {
                    bg: style.backgroundColor,
                    rim: style.boxShadow,
                    images: el.querySelectorAll('img').length,
                };
            },
            undefined,
            { timeout: WAIT_MS },
        )
        .catch(() => null);

/** 主頁「廣播劇」tab：劇集書架次序 */
const checkShelfOrder = async ({ browser, base, errors, log }) => {
    const { ctx, p } = await newE2EPage(browser, errors);
    await p.goto(base);
    await p.waitForSelector('nav[aria-busy="false"]');
    await p.getByRole('button', { name: '廣播劇', exact: true }).click();
    const shelf = p.getByRole('navigation', { name: '廣播劇' });
    await shelf.waitFor();
    const names = (
        await shelf
            .getByRole('button')
            .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))
    ).map(tileName);
    log(names.join(' | ') === SHELF_ORDER.join(' | '), `主頁廣播劇書架次序：${names.join(' | ')}`);
    await ctx.close();
};

/** 今日節目全部未上架（TodayEmpty）嘅黑碟樣，畀短篇劇集頁對照 */
const todayEmptyDisc = async ({ browser, base, errors, log }) => {
    const { ctx, p } = await newE2EPage(browser, errors, {}, { now: E2E_TUESDAY_NOT_UPLOADED });
    await p.goto(`${base}#/today`);
    const empty = p.getByRole('region', { name: TODAY_EMPTY_TITLE });
    const shown = await isShown(empty, { timeout: 10_000 });
    log(shown, `星期二未上架：今日節目頁顯示「${TODAY_EMPTY_TITLE}」`);
    const look = shown ? await discLook(empty) : null;
    await ctx.close();
    return look;
};

/**
 * 第一次入短篇劇集頁：全集表自己彈出（modal），閂咗佢背後嘅掣先喺 accessibility tree 入面。
 * 彈唔出 / 閂唔到就 log fail，返回 false（唔 throw，其他 check 照行）
 */
export const dismissAutoSheet = async (p, log, label) => {
    const sheet = p.getByRole('dialog', { name: '全集' });
    const popped = await isShown(sheet, { timeout: WAIT_MS });
    if (popped) await p.keyboard.press('Escape');
    const closed = popped && (await isShown(sheet, { state: 'detached', timeout: WAIT_MS }));
    if (!closed)
        log(false, `${label}：全集表自己彈出再撳 Esc 閂（彈出 ${popped}，閂咗 ${closed}）`);
    return closed;
};

/** 唱片冇圖、係黑碟，而且同 TodayEmpty 嘅碟一樣（reference 係 null 即係參照量唔到） */
const logBlankDisc = (log, label, look, reference) => {
    log(
        look !== null && look.images === 0 && look.bg === BLANK_DISC_BG,
        `${label}：唱片冇圖，係黑碟（${look?.bg ?? '量唔到唱片'}，圖 ${look?.images} 張）`,
    );
    log(
        look !== null &&
            reference !== null &&
            look.bg === reference.bg &&
            look.rim === reference.rim,
        `${label}：黑碟同今日節目未上架嘅碟一樣（底 ${reference?.bg} / ${look?.bg}，碟邊 ${reference?.rim} / ${look?.rim}）`,
    );
};

/**
 * 短篇劇集頁第一次入（冇進度、冇嘢載入）：唱片冇圖，係同 TodayEmpty 一樣嘅中性黑碟（唔跟劇集主題色），
 * 冇「由頭播放」掣（▶ 喺中間）。中途搵唔到嘢就 log fail 繼續，唔中斷成個 e2e
 */
const checkSeriesFirstVisit = async (env) => {
    const { browser, base, errors, log } = env;
    const label = '短篇劇集頁第一次入';
    const reference = await todayEmptyDisc(env);
    const { ctx, p } = await newE2EPage(browser, errors);
    const loaded = await succeeds(p.goto(`${base}${SERIES_ROUTE}`));
    if (!loaded) log(false, `${label}：劇集頁載入唔到（${SERIES_ROUTE}）`);
    if (loaded && (await dismissAutoSheet(p, log, label))) {
        logBlankDisc(log, label, await discLook(p), reference);
        const restart = await p.getByRole('button', { name: RESTART }).count();
        const play = await p.getByRole('button', { name: '播放', exact: true }).count();
        log(
            restart === 0 && play === 1,
            `${label}：冇「${RESTART}」掣，得播放掣（由頭播放 ${restart}，播放 ${play}）`,
        );
    }
    await ctx.close();
};

/** 廣播劇：書架次序、短篇劇集頁第一次入嘅黑碟 */
export const runDramaPageChecks = async (env) => {
    await checkShelfOrder(env);
    await checkSeriesFirstVisit(env);
};
