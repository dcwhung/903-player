// 睡眠 timer e2e（9d，_mockups_/sleep-timer）：夜間（裝置本地 21:00–05:00）先出月亮掣、日間唔出；
// 開 timer → 月亮 mm:ss + 頁頂進度條；改 / 關；時間到暫停（clock fast-forward）；播完呢集；
// mini player 入口（卡頂進度條）；闊版主頁播放卡入口（選單置右）。
// context 時區由 harness 固定香港（S-1149），E2E_NOW 22:30 = 夜間
import { ensurePlaying, isShown, newE2EPage, waitForPlaybackState } from './harness.mjs';
import { VISUAL_DAY_NOW } from './visualModel.mjs';

const SHOW_ROUTE = '#/show/gongzi';
const MOON = /^睡眠 timer/;
const MOON_OFF = '睡眠 timer';
const MENU = '睡眠 timer';
const UI_WAIT_MS = 5000;
const MINUTE_MS = 60_000;
// 時間到之後多行幾耐（每秒檢查一次，再等 pause 嘅 effect）
const EXPIRE_MARGIN_MS = 3000;
// 播完呢集：跳去離尾幾秒，等佢自己播完
const END_LEAD_SECONDS = 2;
const ENDED_WAIT_MS = 10_000;
const WIDE = { width: 1180, height: 820 };

/** app 自己 new 嘅 <audio> 唔喺 DOM：攔 play() 記低佢（同 visualScenes.mjs 一樣） */
const captureAudio = (ctx) =>
    ctx.addInitScript(() => {
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function capturePlay(...args) {
            window.__e2eAudio = this;
            return play.apply(this, args);
        };
    });

const moonIn = (scope) => scope.getByRole('button', { name: MOON });
const menu = (p) => p.getByRole('dialog', { name: MENU });
/** 內頁頁頭（喺 main 入面，唔係 banner landmark） */
const pageHeader = (p) => p.locator('main header').first();
const pageBar = (p) => p.locator('[data-sleep-timer-bar="page"]');

/** 開選單揀一粒，等選單收埋 */
const pick = async (p, moon, option) => {
    await moon.click();
    await menu(p).waitFor({ timeout: UI_WAIT_MS });
    await menu(p).getByRole('button', { name: option }).click();
    await menu(p).waitFor({ state: 'detached', timeout: UI_WAIT_MS });
};

const checkDaytimeHidden = async ({ browser, base, errors, log }) => {
    const { ctx, p } = await newE2EPage(browser, errors, {}, { now: VISUAL_DAY_NOW });
    await p.goto(`${base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    const count = await moonIn(p).count();
    log(count === 0, `睡眠 timer：日間（14:00）節目頁冇月亮掣（${count}）`);
    await ctx.close();
};

/** 夜間：線條月亮 → 揀 15 分鐘 → 實色 + 分秒 + 頁頂條 → 改 30 分鐘 → 關閉 */
const checkStartChangeCancel = async ({ browser, base, errors, log }) => {
    const { ctx, p } = await newE2EPage(browser, errors);
    await p.goto(`${base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    const header = pageHeader(p);
    const moon = moonIn(header);
    const shown = await isShown(moon, { timeout: UI_WAIT_MS });
    log(shown, '睡眠 timer：夜間（22:30）節目頁頁頭有月亮掣');
    if (!shown) return ctx.close();
    log((await moon.getAttribute('aria-label')) === MOON_OFF, '睡眠 timer：未開係「睡眠 timer」');
    log(!(await pageBar(p).isVisible()), '睡眠 timer：未開冇頁頂進度條');

    await moon.click();
    const options = await menu(p).getByTestId('sleep-timer-options').getByRole('button').count();
    log(options === 4, `睡眠 timer：選單有 4 粒大掣（${options}）`);
    await menu(p).getByRole('button', { name: '15 分鐘' }).click();
    await menu(p).waitFor({ state: 'detached', timeout: UI_WAIT_MS });
    const text = (await moon.textContent()) ?? '';
    log(/^1[45]:\d\d$/.test(text), `睡眠 timer：開咗顯示分秒（${text}）`);
    log(await pageBar(p).isVisible(), '睡眠 timer：開咗有頁頂全闊進度條');
    const box = await pageBar(p).boundingBox();
    log(box?.x === 0 && box.width === 390, `睡眠 timer：進度條全闊（${JSON.stringify(box)}）`);
    const [titleBox, moonBox] = await Promise.all([
        pageHeader(p).locator('h1').boundingBox(),
        moon.boundingBox(),
    ]);
    const titleCenter = (titleBox?.x ?? 0) + (titleBox?.width ?? 0) / 2;
    log(
        Math.abs(titleCenter - 390 / 2) < 1 &&
            moonBox !== null &&
            titleBox !== null &&
            titleBox.x + titleBox.width <= moonBox.x,
        `睡眠 timer：開咗標題照置中（${titleCenter}）、唔疊月亮`,
    );

    await pick(p, moon, '30 分鐘');
    const changed = (await moon.textContent()) ?? '';
    log(/^(30:00|29:\d\d)$/.test(changed), `睡眠 timer：改 30 分鐘由而家重新計（${changed}）`);

    await moon.click();
    await menu(p).getByRole('button', { name: '關閉' }).click();
    await menu(p).waitFor({ state: 'detached', timeout: UI_WAIT_MS });
    log(
        (await moon.getAttribute('aria-label')) === MOON_OFF && !(await pageBar(p).isVisible()),
        '睡眠 timer：撳「關閉」變返未開、冇進度條',
    );
    return ctx.close();
};

/** 時間到：播緊就暫停，月亮變返未開 */
const checkExpiresAndPauses = async ({ browser, base, errors, log }) => {
    const { ctx, p } = await newE2EPage(browser, errors);
    await p.goto(`${base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    const moon = moonIn(pageHeader(p));
    await pick(p, moon, '15 分鐘');

    await p.clock.fastForward(15 * MINUTE_MS + EXPIRE_MARGIN_MS);

    const state = await waitForPlaybackState(p, 'paused');
    log(state === 'paused', `睡眠 timer：15 分鐘到自動暫停（${state}）`);
    log(
        (await moon.getAttribute('aria-label')) === MOON_OFF && !(await pageBar(p).isVisible()),
        '睡眠 timer：時間到變返未開',
    );
    return ctx.close();
};

/** 播完呢集：顯示剩餘時間；揀咗之後呢集播完就停，唔接下一集 */
const checkEndOfEpisode = async ({ browser, base, errors, log }) => {
    const { ctx, p } = await newE2EPage(browser, errors);
    await captureAudio(ctx);
    await p.goto(`${base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    const moon = moonIn(pageHeader(p));
    await moon.click();
    const option = menu(p).getByRole('button', { name: /^播完呢集 剩餘時間：\d+:\d\d$/ });
    const ready = await isShown(option, { timeout: UI_WAIT_MS });
    log(ready, '睡眠 timer：「播完呢集」顯示剩餘時間');
    if (!ready) return ctx.close();
    await option.click();
    await menu(p).waitFor({ state: 'detached', timeout: UI_WAIT_MS });
    const current = await p
        .locator('button[aria-current="true"]')
        .first()
        .getAttribute('aria-label');

    await p.evaluate((lead) => {
        const audio = window.__e2eAudio;
        audio.currentTime = audio.duration - lead;
    }, END_LEAD_SECONDS);
    const stopped = await isShown(moon.and(p.locator('[data-active="false"]')), {
        timeout: ENDED_WAIT_MS,
    });
    const state = await waitForPlaybackState(p, 'paused');
    const after = await p.locator('button[aria-current="true"]').first().getAttribute('aria-label');
    log(stopped && state === 'paused', `睡眠 timer：呢集播完就停（${state}）`);
    const day = (label) => /\d{2}\/\d{2}/.exec(label ?? '')?.[0];
    log(day(after) === day(current), `睡眠 timer：冇接下一集（${current} → ${after}）`);
    return ctx.close();
};

/** 主頁 mini player：播放掣左邊月亮；開咗卡頂進度條 */
const checkMiniPlayer = async ({ browser, base, errors, log }) => {
    const { ctx, p } = await newE2EPage(browser, errors);
    await p.goto(`${base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    await p.getByRole('button', { name: '返回主頁' }).click();
    const mini = p.getByRole('region', { name: /^正在播放/ });
    const moon = moonIn(mini);
    const shown = await isShown(moon, { timeout: UI_WAIT_MS });
    log(shown, '睡眠 timer：主頁 mini player 有月亮掣');
    if (!shown) return ctx.close();
    const [moonBox, toggleBox] = await Promise.all([
        moon.boundingBox(),
        mini.getByRole('button', { name: '暫停', exact: true }).boundingBox(),
    ]);
    log(
        moonBox !== null && toggleBox !== null && moonBox.x + moonBox.width <= toggleBox.x,
        '睡眠 timer：mini player 月亮喺播放掣左邊',
    );
    await pick(p, moon, '15 分鐘');
    const bar = mini.locator('[data-sleep-timer-bar="card"]');
    log(await bar.isVisible(), '睡眠 timer：mini player 卡頂有進度條');
    log(!(await pageBar(p).isVisible()), '睡眠 timer：主頁 mini player 唔出頁頂條');
    return ctx.close();
};

/** 闊版主頁（平板橫）：播放卡指示點嗰行右邊月亮；選單蓋喺卡嗰欄（右邊） */
const checkWideHomeCard = async ({ browser, base, errors, log }) => {
    const { ctx, p } = await newE2EPage(browser, errors, { viewport: WIDE, hasTouch: true });
    await p.goto(`${base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    await p.getByRole('button', { name: '返回主頁' }).first().click();
    const card = p.locator('[data-home-card]');
    const moon = moonIn(card);
    const shown = await isShown(moon, { timeout: UI_WAIT_MS });
    log(shown, '睡眠 timer：闊版主頁播放卡有月亮掣');
    if (!shown) return ctx.close();
    await moon.click();
    const sheet = menu(p);
    await sheet.waitFor({ timeout: UI_WAIT_MS });
    const [sheetBox, cardBox] = await Promise.all([sheet.boundingBox(), card.boundingBox()]);
    log(
        sheetBox !== null && cardBox !== null && sheetBox.x >= cardBox.x - 1,
        `睡眠 timer：闊版選單置右蓋喺播放卡（選單 x ${sheetBox?.x}，卡 x ${cardBox?.x}）`,
    );
    await sheet.getByRole('button', { name: '15 分鐘' }).click();
    await sheet.waitFor({ state: 'detached', timeout: UI_WAIT_MS });
    const box = await pageBar(p).boundingBox();
    log(box?.width === WIDE.width, `睡眠 timer：闊版主頁頁頂全闊進度條（${box?.width}）`);
    return ctx.close();
};

/** run.mjs 入口：每個情境各自一個 context / section */
export const runSleepTimerChecks = async (env, section) => {
    await section('睡眠 timer：日間', () => checkDaytimeHidden(env));
    await section('睡眠 timer：開 / 改 / 關', () => checkStartChangeCancel(env));
    await section('睡眠 timer：時間到', () => checkExpiresAndPauses(env));
    await section('睡眠 timer：播完呢集', () => checkEndOfEpisode(env));
    await section('睡眠 timer：mini player', () => checkMiniPlayer(env));
    await section('睡眠 timer：闊版主頁', () => checkWideHomeCard(env));
};
