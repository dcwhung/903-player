// HomeView 閒置畫面 e2e（9b，_mockups_/home-view-ambient 第 3 輪 B 款）：544×544 方形螢幕 30 秒冇操作就轉。
// 時鐘照常行（harness clock.install），用 p.clock.fastForward 跳過 30 秒。
// 播緊：出閒置畫面（底下 #root inert）；第一下 tap 只叫醒，唔會撳中底下嘅暫停掣、唔轉頁；叫醒後再閒置 30 秒又轉。
// 唔轉：冇嘢載住、有 sheet 開緊（集數清單、休眠選單）、唔係方形螢幕（390×844）。
// 截圖（播緊 / 暫停 / 開咗 timer）輸出去 e2e/screenshots/ambient-*.png。每個情境用獨立 context
import { SHOT, ensurePlaying, isShown, newE2EPage, succeeds } from './harness.mjs';
import { SAMPLE_RECORDINGS } from './sampleData.mjs';

/** HomeView 假設尺寸；刻意寫死做獨立對照，唔 import src 常數 */
const SQUARE = { width: 544, height: 544 };
const PHONE = { width: 390, height: 844 };
const SHOW_ROUTE = '#/show/gongzi';
const LABEL = '閒置畫面';
/** 同 src/config/constants.ts AMBIENT_IDLE_MS（30 秒）+ 少少餘量 */
const IDLE_MS = 30_000;
const IDLE_MARGIN_MS = 1000;
const UI_WAIT_MS = 5000;
// 叫醒之後等幾耐先睇播放有冇變（第一下唔可以撳中暫停掣）
const SETTLE_MS = 600;
const EPISODES = SAMPLE_RECORDINGS.filter((r) => r.showId === 'gongzi').length;
const LIST_BUTTON = `集數清單，共 ${EPISODES} 集`;
const MOON = /^休眠/;
const OUT = new URL('./screenshots', import.meta.url).pathname;

const ambient = (p) => p.getByRole('dialog', { name: LABEL });
const pauseButton = (p) => p.getByRole('button', { name: '暫停', exact: true });
/** 內頁頁頭（喺 main 入面，唔係 banner landmark） */
const pageHeader = (p) => p.locator('main header').first();

/** 冇操作過 30 秒 */
const goIdle = (p) => p.clock.fastForward(IDLE_MS + IDLE_MARGIN_MS);

const appears = (p) => isShown(ambient(p), { timeout: UI_WAIT_MS });
/** 等一陣都冇出（fastForward 完 React 要一格先 render） */
const staysAway = async (p) => {
    await p.waitForTimeout(SETTLE_MS);
    return (await ambient(p).count()) === 0;
};

const openShow = async (env, viewport = SQUARE) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport, hasTouch: true });
    await p.goto(`${env.base}${SHOW_ROUTE}`);
    await ensurePlaying(p);
    return { ctx, p };
};

const shoot = (p, name) => p.screenshot({ ...SHOT, path: `${OUT}/ambient-${name}.png` });

/** 播緊：出閒置畫面、#root inert、時間 / 節目名；tap 暫停掣位置只叫醒，照播、同一頁 */
const checkShowAndWake = async (env) => {
    const { ctx, p } = await openShow(env);
    const pause = await pauseButton(p).boundingBox();
    await goIdle(p);
    const shown = await appears(p);
    env.log(shown, '閒置畫面：節目頁播緊，閒置 30 秒轉閒置畫面');
    if (!shown) return ctx.close();
    const state = await p.evaluate(() => ({
        inert: document.getElementById('root')?.hasAttribute('inert') ?? false,
        text: document.querySelector('[role="dialog"][aria-label="閒置畫面"]')?.textContent ?? '',
    }));
    env.log(
        state.inert && state.text.includes('22:3') && state.text.includes('公子會'),
        `閒置畫面：底下 #root inert、有時間同節目名（${state.text}）`,
    );
    await shoot(p, 'playing');

    // 第一下撳喺暫停掣嘅位置：只叫醒，唔會暫停
    await p.touchscreen.tap(pause.x + pause.width / 2, pause.y + pause.height / 2);
    const gone = await succeeds(ambient(p).waitFor({ state: 'detached', timeout: UI_WAIT_MS }));
    await p.waitForTimeout(SETTLE_MS);
    const after = await p.evaluate(() => ({
        playback: navigator.mediaSession.playbackState,
        hash: location.hash,
        inert: document.getElementById('root')?.hasAttribute('inert') ?? false,
    }));
    env.log(
        gone && after.playback === 'playing' && after.hash === SHOW_ROUTE && !after.inert,
        `閒置畫面：第一下 tap 只叫醒，照播、同一頁（${JSON.stringify(after)}）`,
    );

    await goIdle(p);
    env.log(await appears(p), '閒置畫面：叫醒之後再閒置 30 秒又轉');
    return ctx.close();
};

/** 暫停：已暫停 + 截圖；開咗 timer：頂邊進度條 + 右上分秒 + 截圖 */
const checkPausedAndTimer = async (env) => {
    const { ctx, p } = await openShow(env);
    await pauseButton(p).click();
    await goIdle(p);
    const paused =
        (await appears(p)) &&
        (await ambient(p)
            .getByText(/^已暫停/)
            .isVisible());
    env.log(paused, '閒置畫面：暫停咗顯示「已暫停」');
    if (paused) await shoot(p, 'paused');
    await p.keyboard.press('Escape');
    await ambient(p).waitFor({ state: 'detached', timeout: UI_WAIT_MS });

    await p.getByRole('button', { name: '播放', exact: true }).click();
    await pageHeader(p).getByRole('button', { name: MOON }).click();
    const menu = p.getByRole('dialog', { name: '休眠' });
    await menu.waitFor({ timeout: UI_WAIT_MS });
    // 休眠選單開緊：唔轉
    await goIdle(p);
    env.log(await staysAway(p), '閒置畫面：休眠選單開緊唔轉');
    await menu.getByRole('button', { name: '15 分鐘' }).click();
    await menu.waitFor({ state: 'detached', timeout: UI_WAIT_MS });
    await goIdle(p);
    const timer =
        (await appears(p)) &&
        (await ambient(p)
            .getByText(/^14:\d\d$/)
            .isVisible());
    const bar = await ambient(p).locator('[data-sleep-timer-bar="page"]').boundingBox();
    env.log(
        timer && bar !== null && bar.x === 0 && bar.width === SQUARE.width,
        `閒置畫面：開咗 timer 有頂邊全闊進度條同剩餘分秒（${JSON.stringify(bar)}）`,
    );
    if (timer) await shoot(p, 'timer');
    return ctx.close();
};

/** 集數清單 sheet 開緊：唔轉 */
const checkSheetOpen = async (env) => {
    const { ctx, p } = await openShow(env);
    await p.getByRole('button', { name: LIST_BUTTON }).click();
    await p.getByRole('dialog', { name: '集數' }).waitFor({ timeout: UI_WAIT_MS });
    await goIdle(p);
    env.log(await staysAway(p), '閒置畫面：集數清單 sheet 開緊唔轉');
    await ctx.close();
};

/** 冇嘢載住（主頁未播過）：唔轉 */
const checkNothingLoaded = async (env) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport: SQUARE });
    await p.goto(env.base);
    await p.waitForSelector('nav[aria-busy="false"]');
    await goIdle(p);
    env.log(await staysAway(p), '閒置畫面：冇嘢載住唔轉');
    await ctx.close();
};

/** 唔係方形螢幕（手機直版）：播緊都唔轉 */
const checkPhone = async (env) => {
    const { ctx, p } = await openShow(env, PHONE);
    await goIdle(p);
    env.log(await staysAway(p), '閒置畫面：手機 390×844 播緊都唔轉');
    await ctx.close();
};

/** env = { browser, base, errors, log }；section = run.mjs 嘅 runSection 包裝 */
export const runAmbientChecks = async (env, section) => {
    await section('閒置畫面：播緊 + 叫醒', () => checkShowAndWake(env));
    await section('閒置畫面：暫停 + timer', () => checkPausedAndTimer(env));
    await section('閒置畫面：sheet 開緊', () => checkSheetOpen(env));
    await section('閒置畫面：冇嘢載住', () => checkNothingLoaded(env));
    await section('閒置畫面：手機', () => checkPhone(env));
};
