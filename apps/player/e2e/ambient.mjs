// HomeView 閒置畫面 e2e（9b，_mockups_/home-view-ambient 第 3 輪 B 款）：544×544 方形螢幕 30 秒冇操作就轉。
// 時鐘照常行（harness clock.install），用 p.clock.fastForward 跳過 30 秒。
// 播緊：出閒置畫面（底下 #root inert）；第一下 tap 只叫醒，唔會撳中底下嘅暫停掣、唔轉頁；叫醒後再閒置 30 秒又轉。
// 唔轉：冇嘢載住、有 sheet 開緊（集數清單、休眠選單）、唔係方形螢幕（390×844）。
// 版面（用戶 2026-11-20）：唱片 + 文字成組置中，左右留白（睇得見嘅 pixel）差 ≤ 4px；右格闊度 = 時間，
// 節目名 / 副題一行、唔闊過時間（長就跑馬燈）。節目（公子會）同廣播劇短篇（芝See，名同副題都長）都驗。
// 9c（_mockups_/home-view-night 第 4、6 輪）：模糊 app icon 底圖 + 左上 app 標籤（冇膠囊底、同右上 timer 同一條線、
// 唔撞內容）。量留白 / 焦點框嗰陣暫時收埋底圖，同節目底色比。
// 截圖（播緊 / 暫停 / 開咗 timer / 廣播劇）輸出去 e2e/screenshots/ambient-*.png。每個情境用獨立 context
import {
    DRAMA_AUDIO_BASE,
    SHOT,
    ensurePlaying,
    isShown,
    newE2EPage,
    serveWav,
    succeeds,
    waitForPlaybackState,
} from './harness.mjs';
import { SAMPLE_RECORDINGS } from './sampleData.mjs';

/** HomeView 假設尺寸；刻意寫死做獨立對照，唔 import src 常數 */
const SQUARE = { width: 544, height: 544 };
const PHONE = { width: 390, height: 844 };
const SHOW_ROUTE = '#/show/gongzi';
// 芝See 短篇（src/catalog/dramas/library/chisee/drama.json，刻意寫死做獨立對照；同 squareDrama.mjs）
const SERIES_ROUTE = '#/drama/chisee';
const LONG_ARC_ROW = /^你生日所以我生日，/;
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
/** 同 scripts/brandingConfig.ts DEFAULT_APP_NAME（e2e build 冇 branding；刻意寫死做獨立對照） */
const APP_NAME = '903 Player';
const BACKDROP_ICON = 'icon-maskable-512.png';
/** 左上標籤同右上 timer：頂邊 / 中線差幾多都當同一條線；左右邊距鏡像 */
const ROW_TOLERANCE_PX = 2;

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

// 畫面左右邊各取一條（避開頂邊 timer 條同四角）：唔應該有焦點框
const EDGE_STRIP_PX = 4;
const EDGE_STRIP_TOP = 120;
const EDGE_STRIP_HEIGHT = 300;
// 每個色板（0–255）同節目底色最多差幾多（截圖壓縮 / 抗鋸齒）
const EDGE_COLOR_TOLERANCE = 6;

/** 一條 PNG 截圖入面每個 pixel 同 bg（[r, g, b]）差幾多：喺瀏覽器 decode，唔使額外 PNG library */
const maxDiffFrom = (p, png, bg) =>
    p.evaluate(
        async ({ data, rgb }) => {
            const bitmap = await createImageBitmap(
                await (await fetch(`data:image/png;base64,${data}`)).blob(),
            );
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const g = canvas.getContext('2d');
            g.drawImage(bitmap, 0, 0);
            const px = g.getImageData(0, 0, bitmap.width, bitmap.height).data;
            let max = 0;
            for (let i = 0; i < px.length; i += 4) {
                for (let c = 0; c < 3; c += 1) max = Math.max(max, Math.abs(px[i + c] - rgb[c]));
            }
            return max;
        },
        { data: png.toString('base64'), rgb: bg },
    );

/** 暫時收埋底圖（visibility hidden）先做 run：留白 / 焦點框嘅 pixel 量法要同平色節目底色比 */
const withoutBackdrop = async (p, run) => {
    const toggle = (hidden) =>
        p.evaluate((h) => {
            const el = document.querySelector('[data-ambient-backdrop]');
            if (el) el.style.visibility = h ? 'hidden' : '';
        }, hidden);
    await toggle(true);
    try {
        return await run();
    } finally {
        await toggle(false);
    }
};

/**
 * W-850：出閒置畫面時焦點喺覆蓋層自己、冇焦點框；左右邊緣 pixel 都係節目底色（唔係全屏框）
 */
const checkNoFocusRing = async (env, p) => {
    const focus = await p.evaluate(() => {
        const el = document.activeElement;
        const scope = el?.querySelector('[data-theme-scope]');
        const bg = scope ? getComputedStyle(scope).backgroundColor : '';
        return {
            dialog: el?.getAttribute('role') === 'dialog',
            outline: el ? getComputedStyle(el).outlineStyle : '',
            bg: (bg.match(/\d+/g) ?? []).slice(0, 3).map(Number),
        };
    });
    const strip = (x) =>
        p.screenshot({
            clip: { x, y: EDGE_STRIP_TOP, width: EDGE_STRIP_PX, height: EDGE_STRIP_HEIGHT },
        });
    const { left, right } = await withoutBackdrop(p, async () => ({
        left: await maxDiffFrom(p, await strip(0), focus.bg),
        right: await maxDiffFrom(p, await strip(SQUARE.width - EDGE_STRIP_PX), focus.bg),
    }));
    env.log(
        focus.dialog &&
            focus.outline === 'none' &&
            left <= EDGE_COLOR_TOLERANCE &&
            right <= EDGE_COLOR_TOLERANCE,
        `閒置畫面：焦點喺覆蓋層、冇全屏焦點框（outline ${focus.outline}，邊緣色差 ${left} / ${right}）`,
    );
};

// 左右留白：量截圖中間一段（避開頂邊 timer 條同右上分秒），同底色差過呢個就當睇得見
const BAND_TOP = 100;
const BAND_HEIGHT = 344;
const INK_THRESHOLD = 24;
const MARGIN_TOLERANCE_PX = 4;
// 一行：高度 < 2 × 字號（兩行起碼 2.4 ×）；闊度比較嘅 sub-pixel 餘量
const ONE_LINE_FONT_SHARE = 2;
const WIDTH_TOLERANCE_PX = 0.5;

/** 截圖每一直行有冇唔係底色嘅 pixel：回傳最左 / 最右嗰行（喺瀏覽器 decode） */
const inkColumns = (p, png, bg) =>
    p.evaluate(
        async ({ data, rgb, threshold }) => {
            const bitmap = await createImageBitmap(
                await (await fetch(`data:image/png;base64,${data}`)).blob(),
            );
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const g = canvas.getContext('2d');
            g.drawImage(bitmap, 0, 0);
            const px = g.getImageData(0, 0, bitmap.width, bitmap.height).data;
            let left = bitmap.width;
            let right = -1;
            for (let i = 0; i < px.length; i += 4) {
                const diff = Math.max(...[0, 1, 2].map((c) => Math.abs(px[i + c] - rgb[c])));
                if (diff <= threshold) continue;
                const x = (i / 4) % bitmap.width;
                left = Math.min(left, x);
                right = Math.max(right, x);
            }
            return { left, right, width: bitmap.width };
        },
        { data: png.toString('base64'), rgb: bg, threshold: INK_THRESHOLD },
    );

/** 右格（時間、日子、名、狀態行）尺寸 + 節目底色 */
const lookSide = (p) =>
    ambient(p).evaluate((dialog) => {
        const scope = dialog.querySelector('[data-theme-scope]');
        const side = dialog.querySelector('[data-ambient-status]').lastElementChild;
        const [clock, , name, status] = side.children;
        const box = (el) => {
            const r = el.getBoundingClientRect();
            return {
                width: r.width,
                height: r.height,
                font: parseFloat(getComputedStyle(el).fontSize),
                text: el.textContent,
            };
        };
        return {
            bg: (getComputedStyle(scope).backgroundColor.match(/\d+/g) ?? [])
                .slice(0, 3)
                .map(Number),
            side: side.getBoundingClientRect().width,
            clock: box(clock),
            name: box(name),
            status: box(status),
        };
    });

const oneLineWithinClock = (s, line) =>
    line.height < line.font * ONE_LINE_FONT_SHARE && line.width <= s.side + WIDTH_TOLERANCE_PX;

/**
 * 用戶 2026-11-20：成組置中（睇得見嘅左右留白差 ≤ 4px）；右格闊度 = 時間；名 / 副題一行、唔闊過時間
 */
const checkLayout = async (env, p, label, { margins = true } = {}) => {
    const s = await lookSide(p);
    if (margins) {
        const band = await withoutBackdrop(p, () =>
            p.screenshot({
                ...SHOT,
                clip: { x: 0, y: BAND_TOP, width: SQUARE.width, height: BAND_HEIGHT },
            }),
        );
        const ink = await inkColumns(p, band, s.bg);
        const leftPx = ink.left;
        const rightPx = ink.width - 1 - ink.right;
        env.log(
            ink.right >= 0 && Math.abs(leftPx - rightPx) <= MARGIN_TOLERANCE_PX,
            `閒置畫面（${label}）：唱片 + 文字置中，左右留白 ${leftPx} / ${rightPx}px`,
        );
    }
    env.log(
        Math.abs(s.side - s.clock.width) <= WIDTH_TOLERANCE_PX &&
            oneLineWithinClock(s, s.name) &&
            oneLineWithinClock(s, s.status),
        `閒置畫面（${label}）：右格闊 = 時間（${s.side} / ${s.clock.width}），` +
            `名「${s.name.text}」${s.name.width}×${s.name.height}、副題「${s.status.text}」${s.status.width}×${s.status.height} 一行唔闊過時間`,
    );
};

/** 底圖兩層（模糊 app icon、節目底色）、左上標籤（icon + 短名、冇底色）、唱片 / 右格 / timer 嘅位置 */
const lookChrome = (p) =>
    ambient(p).evaluate((dialog) => {
        const rect = (el) => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
        };
        const backdrop = dialog.querySelector('[data-ambient-backdrop]');
        const label = dialog.querySelector('[data-ambient-label]');
        const layout = dialog.querySelector('[data-ambient-status]');
        const before = backdrop ? getComputedStyle(backdrop, '::before') : null;
        const after = backdrop ? getComputedStyle(backdrop, '::after') : null;
        const labelStyle = label ? getComputedStyle(label) : null;
        const icon = label?.querySelector('img');
        return {
            backdrop: backdrop
                ? {
                      image: before.backgroundImage,
                      filter: before.filter,
                      tint: after.backgroundColor,
                      covers: (() => {
                          const r = backdrop.getBoundingClientRect();
                          return r.width >= innerWidth && r.height >= innerHeight;
                      })(),
                  }
                : null,
            label: label
                ? {
                      text: label.textContent,
                      hidden: label.getAttribute('aria-hidden'),
                      bg: labelStyle.backgroundColor,
                      bgImage: labelStyle.backgroundImage,
                      border: labelStyle.borderStyle,
                      iconLoaded: Boolean(icon?.complete && icon.naturalWidth > 0),
                      box: rect(label),
                  }
                : null,
            timer: rect(dialog.querySelector('[data-ambient-timer]')),
            // 右格前面嗰格係唱片（開咗 timer 時最前仲有 timer 條同分秒）
            disc: rect(layout?.lastElementChild?.previousElementSibling ?? null),
            side: rect(layout?.lastElementChild ?? null),
            width: innerWidth,
        };
    });

const overlaps = (a, b) =>
    a !== null &&
    b !== null &&
    a.left < b.right &&
    b.left < a.right &&
    a.top < b.bottom &&
    b.top < a.bottom;

/**
 * 9c：底圖存在（模糊 app icon + 節目底色）、左上 app 標籤冇膠囊底、唔撞唱片 / 右格；
 * 開咗 timer 就同 timer 同一條線（頂邊、中線差 ≤ 2px），左邊距 = timer 右邊距
 */
const checkBackdropAndLabel = async (env, p, label) => {
    const c = await lookChrome(p);
    const b = c.backdrop;
    env.log(
        b !== null &&
            b.image.includes(BACKDROP_ICON) &&
            b.filter.includes('blur') &&
            b.tint !== 'rgba(0, 0, 0, 0)' &&
            b.covers,
        `閒置畫面（${label}）：模糊 app icon 底圖 + 節目底色（${JSON.stringify(b)}）`,
    );
    const l = c.label;
    env.log(
        l !== null &&
            l.text === APP_NAME &&
            l.hidden === 'true' &&
            l.iconLoaded &&
            l.bg === 'rgba(0, 0, 0, 0)' &&
            l.bgImage === 'none' &&
            l.border === 'none',
        `閒置畫面（${label}）：左上 app 標籤 icon +「${l?.text}」、冇膠囊底（${l?.bg} / ${l?.bgImage} / ${l?.border}）、aria-hidden`,
    );
    env.log(
        l !== null &&
            l.box.left >= 0 &&
            l.box.top >= 0 &&
            !overlaps(l.box, c.disc) &&
            !overlaps(l.box, c.side) &&
            !overlaps(c.timer, c.disc) &&
            !overlaps(c.timer, c.side) &&
            !overlaps(l.box, c.timer),
        `閒置畫面（${label}）：標籤 / timer 唔撞唱片同文字（標籤 ${JSON.stringify(l?.box)}）`,
    );
    if (!c.timer || !l) return;
    const mid = (r) => (r.top + r.bottom) / 2;
    const leftGap = l.box.left;
    const rightGap = c.width - c.timer.right;
    env.log(
        Math.abs(l.box.top - c.timer.top) <= ROW_TOLERANCE_PX &&
            Math.abs(mid(l.box) - mid(c.timer)) <= ROW_TOLERANCE_PX &&
            Math.abs(leftGap - rightGap) <= ROW_TOLERANCE_PX,
        `閒置畫面（${label}）：左上標籤同右上 timer 同一條線（頂 ${l.box.top} / ${c.timer.top}，` +
            `中 ${mid(l.box)} / ${mid(c.timer)}），左右邊距 ${leftGap} / ${rightGap}`,
    );
};

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
    await checkLayout(env, p, '節目播緊');
    await checkBackdropAndLabel(env, p, '節目播緊');
    await checkNoFocusRing(env, p);

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
    if (paused) {
        await shoot(p, 'paused');
        await checkLayout(env, p, '節目暫停');
    }
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
    if (timer) {
        await shoot(p, 'timer');
        // 呢度時鐘已經行到 22:31：Poppins 冇等闊數字，「1」右邊留白大，字形留白差 ~5px（成組照置中，框計）
        await checkLayout(env, p, '開咗 timer', { margins: false });
        await checkBackdropAndLabel(env, p, '開咗 timer');
    }
    return ctx.close();
};

/** 廣播劇短篇（名同副題都長過時間）：撳全集表「你生日所以我生日」、閂表、播放 → 閒置畫面置中、跑馬燈一行 */
const checkSeriesDrama = async (env) => {
    const { ctx, p } = await newE2EPage(env.browser, env.errors, { viewport: SQUARE });
    await ctx.route(`${DRAMA_AUDIO_BASE}/**`, (route) => serveWav(route));
    await p.goto(`${env.base}${SERIES_ROUTE}`);
    const all = p.getByRole('dialog', { name: '全集' });
    await all.waitFor({ timeout: UI_WAIT_MS });
    await all.getByRole('button', { name: LONG_ARC_ROW }).click();
    await p.getByRole('dialog', { name: '集數' }).waitFor({ timeout: UI_WAIT_MS });
    await p.keyboard.press('Escape');
    await p
        .getByRole('dialog', { name: '集數' })
        .waitFor({ state: 'detached', timeout: UI_WAIT_MS });
    await p.getByRole('button', { name: '播放', exact: true }).click();
    await waitForPlaybackState(p, 'playing');
    await goIdle(p);
    const shown = await appears(p);
    env.log(shown, '閒置畫面：廣播劇短篇播緊，閒置 30 秒轉閒置畫面');
    if (shown) {
        await shoot(p, 'drama');
        await checkLayout(env, p, '廣播劇短篇');
        await checkBackdropAndLabel(env, p, '廣播劇短篇');
    }
    await ctx.close();
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
    await section('閒置畫面：廣播劇短篇', () => checkSeriesDrama(env));
    await section('閒置畫面：sheet 開緊', () => checkSheetOpen(env));
    await section('閒置畫面：冇嘢載住', () => checkNothingLoaded(env));
    await section('閒置畫面：手機', () => checkPhone(env));
};
