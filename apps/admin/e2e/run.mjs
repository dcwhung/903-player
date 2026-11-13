// Admin e2e（細 smoke）：vite preview 出 dist，Playwright mock 晒 /api、/auth（唔使 Worker / Google）。
// 用法：npm run e2e -w apps/admin（= build + 呢個檔）；E2E_PORT 改 port；PW_CHROMIUM_PATH 指定 Chromium
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createState, E2E_NOW, E2E_TIMEZONE, installMockApi } from './mockApi.mjs';

const PORT = Number(process.env.E2E_PORT || 4174);
const BASE = `http://localhost:${PORT}`;
const OUT = fileURLToPath(new URL('./screenshots', import.meta.url));
const WIDE = { width: 1280, height: 860 };
const PORTRAIT = { width: 390, height: 844 };
const STARTUP_TIMEOUT_MS = 30_000;
const KEY_GAP_MS = 200;

let failures = 0;
const log = (ok, message) => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`);
};

const STOP_TIMEOUT_MS = 5_000;
const POLL_MS = 250;
const STDERR_TAIL_CHARS = 2_000;
/** 128 + signal number：shell 慣例 */
const SIGNAL_EXIT_CODES = { SIGINT: 130, SIGTERM: 143 };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** port 有人用緊（例如上次殘留嘅 vite preview）就即刻停：否則 --strictPort 起唔到，會靜靜雞測咗舊 dist */
const assertPortFree = () =>
    new Promise((resolve, reject) => {
        const probe = createServer();
        probe.once('error', () =>
            reject(
                new Error(
                    `port ${PORT} is already in use (stale vite preview?). ` +
                        `Free it (ss -ltnp | grep :${PORT}) or set E2E_PORT.`,
                ),
            ),
        );
        probe.listen(PORT, () => probe.close(resolve));
    });

/** Node fetch（undici）封鎖 WHATWG「bad ports」（例如 4190）：錯誤 cause 係 `bad port` */
const isBadPort = (error) => error?.cause?.message === 'bad port';

/**
 * S-848：Node fetch 唔准連嘅 port，preview 起咗都永遠 poll 唔到，會等足 STARTUP_TIMEOUT_MS 先報「did not start」。
 * 起 preview 之前試 fetch 一次（port 冇人聽 = ECONNREFUSED，正常），bad port 就即刻報清楚
 */
const assertFetchablePort = async () => {
    try {
        await fetch(BASE);
    } catch (error) {
        if (isBadPort(error))
            throw new Error(
                `port ${PORT} is blocked by Node fetch ("bad port", WHATWG port blocking). ` +
                    'Set E2E_PORT to another port, e.g. 4185.',
            );
    }
};

/**
 * detached：preview 自成一個 process group（pgid = pid），
 * 收尾 kill 成個 group，連 npx 下面嘅 vite 一齊停，唔會殘留霸住 port
 */
const startPreview = () => {
    const child = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        detached: true,
        stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
        stderr = (stderr + chunk).slice(-STDERR_TAIL_CHARS);
    });
    const exited = new Promise((resolve) =>
        child.once('exit', (code, signal) => resolve({ code, signal, stderr })),
    );
    return { child, exited };
};

/** group 仲有冇 process（signal 0 = 淨係探） */
const groupAlive = (pid) => {
    try {
        process.kill(-pid, 0);
        return true;
    } catch {
        return false;
    }
};

const signalGroup = (pid, signal) => {
    try {
        process.kill(-pid, signal);
    } catch {
        // group 已經冇晒
    }
};

/** SIGTERM 成個 group，等佢冇晒（port 先真正放返）；超時就 SIGKILL */
const stopPreview = async ({ child }) => {
    if (!child.pid || !groupAlive(child.pid)) return;
    signalGroup(child.pid, 'SIGTERM');
    const deadline = Date.now() + STOP_TIMEOUT_MS;
    while (groupAlive(child.pid) && Date.now() < deadline) await sleep(POLL_MS);
    if (groupAlive(child.pid)) signalGroup(child.pid, 'SIGKILL');
};

/** 同步版：俾 SIGINT / exit handler 用（唔可以 await） */
const killPreviewNow = ({ child }) => {
    if (child.pid) signalGroup(child.pid, 'SIGTERM');
};

/** server ready 之前 preview 已經退出（例如撞 port）就即刻 fail，唔好等到 timeout */
const waitForServer = async ({ exited }) => {
    let exitInfo = null;
    exited.then((info) => {
        exitInfo = info;
    });
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    while (Date.now() < deadline) {
        if (exitInfo) {
            const { code, signal, stderr } = exitInfo;
            throw new Error(
                `vite preview exited before ready (code ${code}, signal ${signal})` +
                    (stderr.trim() ? `:\n${stderr.trim()}` : ''),
            );
        }
        try {
            if ((await fetch(BASE)).ok) return;
        } catch (error) {
            if (isBadPort(error)) throw error;
            // 未起好
        }
        await sleep(POLL_MS);
    }
    throw new Error(`vite preview did not start on ${BASE}`);
};

/** 固定時鐘 + 香港時區（同 mockApi E2E_NOW）：「今日」= 12/11/2026，timer 照行 */
const newPage = async (browser, state, viewport = WIDE) => {
    const page = await browser.newPage({ viewport, timezoneId: E2E_TIMEZONE });
    await page.clock.setFixedTime(E2E_NOW);
    await installMockApi(page, state);
    return page;
};

/** 每個主要畫面淺色 + 深色各一張（深色 = prefers-color-scheme: dark）；彈出動畫直接跳到尾（唔影到半透明） */
const shoot = async (page, name, extra = {}) => {
    const options = { animations: 'disabled', ...extra };
    await page.emulateMedia({ colorScheme: 'light' });
    await page.screenshot({ path: `${OUT}/${name}.png`, ...options });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.screenshot({ path: `${OUT}/${name}-dark.png`, ...options });
    await page.emulateMedia({ colorScheme: 'light' });
};

const loggedIn = (options) => ({ ...createState(options), loggedIn: true });

/*
 * 字色對底色嘅對比度（WCAG）：底色由自己向上搵第一個唔透明嘅 background（揀咗嘅 tab 用佢底下嘅膠囊）；
 * 自己 / 祖先有 opacity 就將字同底一齊混落再上一層嘅底（= 畫面上真正見到嘅顏色）
 */
const contrastOf = (locator) =>
    locator.evaluate((el) => {
        const parse = (value) => {
            const [r, g, b, a = 1] = value.match(/[\d.]+/g).map(Number);
            return { r, g, b, a };
        };
        const over = (top, under, alpha = top.a) => ({
            r: top.r * alpha + under.r * (1 - alpha),
            g: top.g * alpha + under.g * (1 - alpha),
            b: top.b * alpha + under.b * (1 - alpha),
            a: 1,
        });
        // 揀咗嘅「編輯｜預覽」tab 本身透明，真正墊底嘅係同層嘅共用膠囊（.view-pill）
        const fillOf = (node) => {
            const pill =
                node.getAttribute?.('aria-selected') === 'true'
                    ? node.parentElement?.querySelector(':scope > .view-pill')
                    : null;
            return getComputedStyle(pill ?? node).backgroundColor;
        };
        const bgOf = (start) => {
            for (let node = start; node; node = node.parentElement) {
                const bg = parse(fillOf(node));
                if (bg.a > 0) return bg.a === 1 ? bg : over(bg, bgOf(node.parentElement));
            }
            return { r: 255, g: 255, b: 255, a: 1 };
        };
        let opacity = 1;
        for (let node = el; node; node = node.parentElement)
            opacity *= Number(getComputedStyle(node).opacity);
        const bg = bgOf(el);
        const under = bgOf(el.parentElement?.parentElement ?? null);
        const fg = over(parse(getComputedStyle(el).color), bg);
        const [shownFg, shownBg] = [over(fg, under, opacity), over(bg, under, opacity)];
        const lum = ({ r, g, b }) => {
            const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
            return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        };
        const [hi, lo] = [lum(shownFg), lum(shownBg)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
    });

/** 淺色 + 深色各量一次對比度，任何一個低過 min 就 throw */
const assertContrast = async (page, locator, min, what) => {
    for (const scheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: scheme });
        const ratio = await contrastOf(locator);
        if (ratio < min)
            throw new Error(`${what} (${scheme}): contrast ${ratio.toFixed(2)} < ${min}`);
    }
    await page.emulateMedia({ colorScheme: 'light' });
};

const check = async (name, fn) => {
    try {
        await fn();
        log(true, name);
    } catch (error) {
        log(false, `${name}: ${error instanceof Error ? error.message : error}`);
    }
};

/** Google「Sign in with Google」官方色（mockup admin-login --gsi-*） */
const GSI = {
    light: {
        background: 'rgb(255, 255, 255)',
        border: 'rgb(116, 119, 117)',
        color: 'rgb(31, 31, 31)',
        radius: '20px',
    },
    dark: {
        background: 'rgb(19, 19, 20)',
        border: 'rgb(142, 145, 143)',
        color: 'rgb(227, 227, 227)',
        radius: '20px',
    },
};

const gsiColours = (locator) =>
    locator.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
            background: style.backgroundColor,
            border: style.borderTopColor,
            color: style.color,
            radius: style.borderTopLeftRadius,
        };
    });

const loginCheck = (browser) =>
    check('login screen when /api/me is 401', async () => {
        const page = await newPage(browser, createState());
        await page.goto(BASE);
        const google = page.getByRole('link', { name: '使用 Google 登入' });
        await google.waitFor();
        if ((await google.getAttribute('href')) !== '/auth/google/start')
            throw new Error('bad href');
        // 款 3（_mockups_/admin-login #3）：全頁 banner 背景 + 毛玻璃卡；Google 掣跟官方淺 / 深色款
        await page.locator('.login-card').waitFor();
        await page.evaluate(() => document.fonts.ready);
        for (const [scheme, expected] of Object.entries(GSI)) {
            await page.emulateMedia({ colorScheme: scheme });
            const got = await gsiColours(google);
            if (JSON.stringify(got) !== JSON.stringify(expected))
                throw new Error(`${scheme} Google button: ${JSON.stringify(got)}`);
        }
        await page.emulateMedia({ colorScheme: 'light' });
        // S-833：G 係 <img alt="">（asset 檔），要真係載入到、20×20
        const logo = await google.locator('img[alt=""]').evaluate((img) => ({
            loaded: img.complete && img.naturalWidth > 0,
            w: img.width,
            h: img.height,
        }));
        if (!logo.loaded || logo.w !== 20 || logo.h !== 20)
            throw new Error(`Google G image: ${JSON.stringify(logo)}`);
        const bg = await page
            .locator('.login-bg')
            .evaluate((el) => getComputedStyle(el).backgroundImage);
        if (!bg.includes('/banner.webp')) throw new Error(`login background: ${bg}`);
        await shoot(page, 'login');
        // admin 揀咗深色（localStorage admin.theme）：系統淺色都用深色款
        await page.evaluate(() => localStorage.setItem('admin.theme', 'dark'));
        await page.reload();
        await google.waitFor();
        const manual = await gsiColours(google);
        if (JSON.stringify(manual) !== JSON.stringify(GSI.dark))
            throw new Error(`data-theme dark Google button: ${JSON.stringify(manual)}`);
        await page.evaluate(() => localStorage.removeItem('admin.theme'));
        // S-809：深連結 login 完要返返嚟 → ?next=（只係同源相對路徑）
        await page.goto(`${BASE}/dramas/lancy/schedule#lancy-02`);
        const deep = await google.getAttribute('href');
        if (deep !== '/auth/google/start?next=%2Fdramas%2Flancy%2Fschedule%23lancy-02')
            throw new Error(`deep link not passed to login: ${deep}`);
        await page.close();
    });

const todoFlowCheck = (browser) =>
    check('auto scan → matrix → confirm auto ID unchanged → back → publish → history', async () => {
        const state = loggedIn();
        const page = await newPage(browser, state);
        await page.goto(BASE);
        await page.getByText('已掃描 R2').waitFor();
        await page.getByRole('list', { name: '待辦統計' }).waitFor();
        await shoot(page, 'update');
        await page.getByRole('link', { name: '我心不死：ID' }).click();
        await page.getByRole('region', { name: '處理待辦' }).getByText('尚欠：ID').waitFor();
        const id = page.getByRole('textbox', { name: /短篇 ID/ });
        if ((await id.inputValue()) !== 'lancy-02') throw new Error('auto arc id missing');
        if (
            !(await id.locator('xpath=ancestor::label').getAttribute('class'))?.includes(
                'unconfirmed',
            )
        )
            throw new Error('unconfirmed ID not marked red');
        await shoot(page, 'arc-editor', { fullPage: true });
        await page.getByRole('button', { name: '儲存並返回待辦' }).click();
        await page.getByRole('button', { name: '下一步：確認發佈' }).click();
        await page.getByText('即時上線').waitFor();
        await shoot(page, 'publish');
        await page.getByRole('button', { name: '發佈', exact: true }).click();
        await page.getByRole('heading', { name: '發佈 / 部署' }).waitFor();
        await page.getByText('使用中').waitFor();
        await page.getByText('#4', { exact: true }).waitFor();
        // #3 淨換首頁 Banner：顯示「更換 · 首頁 Banner」，唔係「沒有內容變更」
        await page.locator('.hist-row .changes .name').filter({ hasText: '首頁 Banner' }).waitFor();
        if ((await page.getByText('沒有內容變更').count()) > 0)
            throw new Error('banner-only publish should not say 沒有內容變更');
        await shoot(page, 'history');
        await page.getByRole('button', { name: '還原至 #2' }).click();
        await page.getByText('只會還原上架狀態').waitFor();
        await shoot(page, 'rollback-confirm');
        await page.getByRole('button', { name: '取消' }).click();
        const confirm = JSON.stringify(state.confirms);
        if (confirm !== '[{"dramaId":"lancy","arcId":"lancy-02"}]')
            throw new Error(`confirm-id calls: ${confirm}`);
        if (state.puts.length > 0) throw new Error('unchanged arc should not PUT the entry');
        await page.close();
    });

const reorderCheck = (browser) =>
    check('keyboard drag reorder saves on drop', async () => {
        const state = loggedIn();
        const page = await newPage(browser, state);
        await page.goto(`${BASE}/dramas`);
        const handle = page.getByRole('button', { name: '拖曳以調整「蘭茜夫人劇場」的次序' });
        await handle.focus();
        // dnd-kit 每一步之間要量度 layout：撳掣之間停一停
        for (const key of ['Space', 'ArrowDown', 'Space']) {
            await page.keyboard.press(key);
            await page.waitForTimeout(KEY_GAP_MS);
        }
        await page.getByText('已更新次序').waitFor();
        const ids = state.orders[0]?.ids.join(',');
        if (ids !== 'golden,lancy') throw new Error(`order was ${ids}`);
        if (page.url() !== `${BASE}/dramas`) throw new Error('drag opened the editor');
        await shoot(page, 'dramas');
        await page.close();
    });

const newDramaDialogCheck = (browser) =>
    check('＋ dialog: Tab stays inside, Esc closes and focus returns to ＋ (S-811)', async () => {
        const page = await newPage(browser, loggedIn());
        await page.goto(`${BASE}/dramas`);
        const add = page.getByRole('button', { name: '新增廣播劇' });
        await add.click();
        const dialog = page.getByRole('dialog', { name: '新增廣播劇' });
        await dialog.waitFor();
        await shoot(page, 'new-drama-dialog');
        const focused = () => page.evaluate(() => document.activeElement?.textContent?.trim());
        const seen = [];
        for (let i = 0; i < 3; i += 1) {
            seen.push(await focused());
            await page.keyboard.press('Tab');
        }
        if (seen.join(',') !== '關閉,重新掃描,關閉') throw new Error(`Tab order ${seen}`);
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'detached' });
        if (!(await add.evaluate((el) => el === document.activeElement)))
            throw new Error('focus did not return to ＋');
        await page.close();
    });

const showListCheck = (browser) =>
    check('show list: air time meta, legend, whole row opens the editor', async () => {
        const page = await newPage(browser, loggedIn());
        await page.goto(`${BASE}/shows`);
        await page.getByText('星期一至五（15:00 - 16:30）').waitFor();
        await page.getByRole('group', { name: '圖例' }).waitFor();
        await shoot(page, 'shows');
        await page.getByText('星期一至五（15:00 - 16:30）').click();
        await page.waitForURL(`${BASE}/shows/waves`);
        await page.close();
    });

const SCHEDULE_PARTLY = `${BASE}/dramas/lancy/schedule#lancy-02`;
/** 「編輯｜預覽」膠囊滑動（--motion-move + --motion-trail）完咗先截圖 */
const PILL_SETTLE_MS = 400;
const SCHEDULE_ALL_LISTED = `${BASE}/dramas/lancy/schedule#half`;
/** 真封面（e2e/fixtures）：排程截圖有碟面 */
const scheduleState = () => loggedIn({ realImages: true });

/** 兩個 panel 嘅左上角：並排 = 同一行、上下排 = 同一列 */
const panelBoxes = async (page) =>
    Promise.all(
        ['上架', '下架'].map(async (name) =>
            page
                .locator('section.panel', { has: page.getByRole('heading', { name }) })
                .boundingBox(),
        ),
    );

/** 今日（12/11 四）唔撞日：上架、下架時間軸各有一格「今日」，日子 12/11 四 */
const assertTodayCells = async (page) => {
    for (const name of ['上架時間軸', '下架時間軸']) {
        const cell = page.getByRole('group', { name }).locator('.seg-batch.today-cell');
        if ((await cell.count()) !== 1) throw new Error(`${name}: no 今日 cell`);
        const text = (await cell.innerText()).replace(/\s+/g, ' ').trim();
        if (text !== '今日 12/11 四') throw new Error(`${name}: 今日 cell reads ${text}`);
    }
};

/**
 * 用戶 2026-11-12 第二輪：今日格冇框（只係淺主色底）；批次表同內容頁列表一樣冇底色（唔係黃色卡），淺深色都量
 */
const assertPlainToday = async (page) => {
    for (const scheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: scheme });
        const looks = await page.evaluate(() => {
            const style = (selector) => getComputedStyle(document.querySelector(selector));
            return {
                ring: style('.strip.preview .day-group.today').boxShadow,
                outline: style('.strip.preview .day-group.today').outlineStyle,
                section: style('.batch-section').backgroundColor,
                table: style('table.batches').backgroundColor,
                bar: style('table.batches tr.today td').boxShadow,
            };
        });
        if (looks.ring !== 'none' || looks.outline !== 'none' || looks.bar !== 'none')
            throw new Error(`${scheme}: 今日 has a border ${JSON.stringify(looks)}`);
        if (looks.section !== 'rgba(0, 0, 0, 0)' || looks.table !== 'rgba(0, 0, 0, 0)')
            throw new Error(`${scheme}: batch table has a background ${JSON.stringify(looks)}`);
    }
    await page.emulateMedia({ colorScheme: 'light' });
};

/** 句子兩段：同一行，或者第二段（「逢」開頭）喺下一行嘅最左 */
const assertCadenceBreaks = async (page) => {
    for (const sentence of await page.locator('.sentence.cadence').all()) {
        const box = await sentence.boundingBox();
        const [first, second] = await Promise.all(
            [0, 1].map((i) => sentence.locator('.cadence-part').nth(i).boundingBox()),
        );
        const text = await sentence.locator('.cadence-part').nth(1).innerText();
        if (!box || !first || !second || !text.startsWith('逢'))
            throw new Error(`cadence parts: ${text}`);
        const sameLine = Math.abs(first.y - second.y) < 2;
        if (!sameLine && Math.abs(second.x - box.x) > 1)
            throw new Error('逢 part wrapped but not at the start of a line');
    }
};

const scheduleEditCheck = (browser) =>
    check(
        'schedule 編輯 (mockup ⑧): 上架 / 下架 panels side by side, stacked under 900px',
        async () => {
            const page = await newPage(browser, scheduleState());
            await page.goto(SCHEDULE_PARTLY);
            await page.getByText('可上架：第 16–37 集（共 22 集）').waitFor();
            await page
                .getByText('可下架：第 1–15 集（已上架）· 第 16–37 集（已排程上架）')
                .waitFor();
            if (
                (await page
                    .getByRole('tab', { name: '編輯', exact: true })
                    .getAttribute('aria-selected')) !== 'true'
            )
                throw new Error('編輯 tab not selected');
            await page.getByRole('button', { name: '每週 1 次' }).click();
            await page.getByRole('spinbutton', { name: '每次上架集數' }).fill('5');
            // 下架方式 = 快速套用 chip（同上架一樣），唔係 segmented 大框
            if ((await page.locator('section.panel.down .seg').count()) > 0)
                throw new Error('unlist modes still in a segmented box');
            await page.locator('section.panel.down .presets').getByText('快速套用：').waitFor();
            await page.getByRole('button', { name: '逢星期 X 下架 N 集' }).click();
            await page.getByRole('spinbutton', { name: '每次下架集數' }).fill('6');
            await page.getByText('✓ 已上架').waitFor();
            const listed = page
                .getByRole('group', { name: '上架時間軸' })
                .locator('.seg-batch.listed');
            if ((await listed.count()) !== 1) throw new Error('listed episodes not one grey group');
            const offCells = page
                .getByRole('group', { name: '下架時間軸' })
                .locator('.seg-batch.off');
            if ((await offCells.count()) === 0) throw new Error('no unlist batches');
            if ((await page.getByRole('alert').count()) > 0)
                throw new Error('error shown before 儲存');
            const [up, down] = await panelBoxes(page);
            if (!up || !down || Math.abs(up.y - down.y) > 1 || down.x <= up.x)
                throw new Error('panels not side by side');
            // 今日 12/11 唔係上架 / 下架日：兩條時間軸都插一格「今日」
            await assertTodayCells(page);
            await assertCadenceBreaks(page);
            await shoot(page, 'schedule-edit', { fullPage: true });
            await page.setViewportSize({ width: 860, height: 860 });
            const [upNarrow, downNarrow] = await panelBoxes(page);
            if (!upNarrow || !downNarrow || downNarrow.y <= upNarrow.y)
                throw new Error('panels not stacked under 900px');
            await page.close();
        },
    );

const schedulePreviewCheck = (browser) =>
    check('schedule 預覽 (mockup ⑨): merged timeline, 上下架批次 table, cell tooltip', async () => {
        const page = await newPage(browser, scheduleState());
        await page.goto(SCHEDULE_PARTLY);
        await page.getByRole('button', { name: '每週 1 次' }).click();
        await page.getByRole('spinbutton', { name: '每次上架集數' }).fill('5');
        await page.getByRole('button', { name: '逢星期 X 下架 N 集' }).click();
        await page.getByRole('spinbutton', { name: '每次下架集數' }).fill('6');
        await page.getByRole('tab', { name: '預覽' }).click();
        if (await page.getByRole('heading', { name: '上架' }).isVisible())
            throw new Error('edit panels still shown in 預覽');
        await assertPreviewTitles(page, /^共 \d+ 批 · 第 16–37 集上架 · 第 1–37 集下架$/);
        // 今日 12/11 喺第一個上架日（15/11）之前：時間軸最前一格「今日」、批次表第一行今日
        const todayCell = page.locator('.strip.preview > .day-group').first();
        if (!(await todayCell.evaluate((el) => el.classList.contains('today-cell'))))
            throw new Error('preview: 今日 not the first cell');
        const firstRow = page.locator('table.batches tbody tr').first();
        const rowText = (await firstRow.innerText()).replace(/\s+/g, ' ').trim();
        if (rowText !== '12/11 四（今日） — —') throw new Error(`today row: ${rowText}`);
        await assertPlainToday(page);
        const heads = await page.locator('table.batches th').allTextContents();
        if (heads.join() !== '日期,上架,下架') throw new Error(`table columns ${heads}`);
        await page.locator('table.batches .pill.info').first().waitFor();
        await page.locator('table.batches .pill.bad').first().waitFor();
        const cell = page.getByRole('img', { name: /^第 16 集：.+ 上架，.+ 下架，共 \d+ 日$/ });
        await cell.first().hover();
        const tip = page.locator('.tip-pop');
        await tip.waitFor();
        if (!/^第 16 集：\d+\/\d+ 上架，\d+\/\d+ 下架，共 \d+ 日$/.test(await tip.textContent()))
            throw new Error(`tooltip: ${await tip.textContent()}`);
        // 等膠囊滑完、tooltip 淡入完先影
        await page.waitForTimeout(PILL_SETTLE_MS);
        await shoot(page, 'schedule-preview', { fullPage: true });
        await page.close();
    });

/**
 * 預覽標題（用戶 2026-11-12 方案 A）：h3「上下架批次」+ 同一行靠右嘅摘要，h4「時間軸」「列表」小標各自命名一個 region
 */
const assertPreviewTitles = async (page, summary) => {
    const title = page.getByRole('heading', { level: 3, name: '上下架批次' });
    const text = await page.locator('.preview-head .muted').textContent();
    if (!summary.test(text)) throw new Error(`preview summary: ${text}`);
    const [titleBox, summaryBox, headBox] = await Promise.all([
        title.boundingBox(),
        page.locator('.preview-head .muted').boundingBox(),
        page.locator('.preview-head').boundingBox(),
    ]);
    if (!titleBox || !summaryBox || !headBox) throw new Error('preview head not shown');
    if (Math.abs(summaryBox.x + summaryBox.width - (headBox.x + headBox.width)) > 1)
        throw new Error('preview summary not right-aligned');
    for (const name of ['時間軸', '列表'])
        await page.getByRole('region', { name }).getByRole('heading', { level: 4, name }).waitFor();
};

/** 冇下架嘅預覽：摘要冇「下架」部分 */
const schedulePreviewListingOnlyCheck = (browser) =>
    check('schedule 預覽 without unlisting: summary has no 下架 part', async () => {
        const page = await newPage(browser, scheduleState());
        await page.goto(SCHEDULE_PARTLY);
        await page.getByRole('tab', { name: '預覽' }).click();
        await assertPreviewTitles(page, /^共 5 批 · 第 16–37 集上架$/);
        await page.waitForTimeout(PILL_SETTLE_MS);
        await shoot(page, 'schedule-preview-listing-only', { fullPage: true });
        await page.close();
    });

const scheduleChipCheck = (browser) =>
    check(
        'schedule: arc chips follow the saved schedules (已全部上架 / 已上 15 / 37 集)',
        async () => {
            const page = await newPage(browser, scheduleState());
            await page.goto(SCHEDULE_PARTLY);
            const note = (name) =>
                page.getByRole('tab', { name: new RegExp(name) }).locator('small');
            await page.getByRole('tab', { name: /我心不死/ }).waitFor();
            const notes = [
                await note('^戀愛二分一').textContent(),
                await note('我心不死').textContent(),
            ];
            if (notes.join() !== '已全部上架,已上 15 / 37 集') throw new Error(`chips: ${notes}`);
            // 已存嘅規則讀返入句子：由下一批起逢 X、每次 5 集
            if ((await page.getByRole('spinbutton', { name: '每次上架集數' }).inputValue()) !== '5')
                throw new Error('saved rule not read into the sentence');
            await shoot(page, 'schedule-chips', { fullPage: true });
            await page.close();
        },
    );

const MIN_CONTRAST = 3;

const scheduleContrastCheck = (browser) =>
    check(
        'schedule chips / 編輯｜預覽 tabs: text ≥ 3:1 selected, hovered or not (light + dark)',
        async () => {
            const page = await newPage(browser, scheduleState());
            await page.goto(SCHEDULE_PARTLY);
            await page.getByRole('button', { name: '每日 1 集' }).click();
            await page.getByRole('button', { name: '指定日全部' }).click();
            const buttons = [
                ...['一次性全部', '每日 1 集', '每週 1 次'],
                ...['不下架', '指定日全部', '上架 N 日後', '逢星期 X 下架 N 集'],
            ]
                .map((name) => page.getByRole('button', { name, exact: true }))
                .concat(['編輯', '預覽'].map((name) => page.getByRole('tab', { name })));
            const low = [];
            for (const scheme of ['light', 'dark']) {
                await page.emulateMedia({ colorScheme: scheme });
                for (const button of buttons) {
                    await page.mouse.move(0, 0);
                    const plain = await contrastOf(button);
                    await button.hover();
                    const hovered = await contrastOf(button);
                    const name = await button.textContent();
                    const pressed =
                        (await button.getAttribute('aria-pressed')) ??
                        (await button.getAttribute('aria-selected'));
                    if (Math.min(plain, hovered) < MIN_CONTRAST)
                        low.push(
                            `${scheme} ${name}(${pressed}) ${plain.toFixed(2)}/${hovered.toFixed(2)}`,
                        );
                }
            }
            await page.emulateMedia({ colorScheme: 'light' });
            if (low.length > 0) throw new Error(low.join('; '));
            await page.close();
        },
    );

const scheduleAllListedCheck = (browser) =>
    check('schedule: every episode listed → only 下架 can be set', async () => {
        const page = await newPage(browser, scheduleState());
        await page.goto(SCHEDULE_ALL_LISTED);
        await page.getByText('✓ 已全部上架（27/10 二 · 第 1–30 集）').waitFor();
        if (await page.getByRole('group', { name: '快速套用' }).isVisible())
            throw new Error('presets shown for an arc already listed');
        if ((await page.getByText(/每次上架/).count()) > 0)
            throw new Error('listing sentence shown');
        await page.getByRole('button', { name: '指定日全部' }).click();
        await page.getByText('全部下架').waitFor();
        await page.getByRole('group', { name: '下架時間軸' }).waitFor();
        await shoot(page, 'schedule-all-listed', { fullPage: true });
        await page.close();
    });

/*
 * 下架日最早 = 今日（用戶 2026-11-12），所以用排程中嘅短篇：下架日 1/12 早過第 31 集 6/12 上架 → 儲存先彈錯
 */
const scheduleConflictCheck = (browser) =>
    check('schedule: an unlist date not after listing pops an error only on 儲存', async () => {
        const page = await newPage(browser, scheduleState());
        await page.goto(SCHEDULE_PARTLY);
        await page.getByRole('button', { name: '指定日全部' }).click();
        await page.getByLabel('下架日期', { exact: true }).fill('01/12/2026');
        await page.getByText('全部下架').waitFor();
        if ((await page.getByRole('alert').count()) > 0) throw new Error('error shown before 儲存');
        await page.getByRole('button', { name: '儲存' }).click();
        const alert = page.getByRole('alert');
        await alert.waitFor();
        const text = await alert.textContent();
        if (
            text !==
            '無法儲存：第 31 集的下架日期（1/12 二）必須遲於其上架日期（6/12 日），請修改下架設定。'
        )
            throw new Error(`alert: ${text}`);
        await shoot(page, 'schedule-conflict', { fullPage: true });
        await page.close();
    });

/** W-715：「上架 N 日後」由舊上架日計出今日之前嘅下架日 → 儲存先彈錯，唔會即時落架 */
const scheduleUnlistPastCheck = (browser) =>
    check(
        'schedule: an unlist date before today pops an error only on 儲存, naming the range (W-715, S-843)',
        async () => {
            const page = await newPage(browser, scheduleState());
            await page.goto(SCHEDULE_ALL_LISTED);
            await page.getByRole('button', { name: '上架 N 日後' }).click();
            await page.getByRole('spinbutton', { name: '上架後日數' }).fill('10');
            if ((await page.getByRole('alert').count()) > 0)
                throw new Error('error shown before 儲存');
            await page.getByRole('button', { name: '儲存' }).click();
            const alert = page.getByRole('alert');
            await alert.waitFor();
            const text = await alert.textContent();
            if (text !== '無法儲存：第 1–30 集的下架日期（6/11 五）早於今日，請修改下架設定。')
                throw new Error(`alert: ${text}`);
            await shoot(page, 'schedule-unlist-past', { fullPage: true });
            await page.close();
        },
    );

/*
 * 日期欄（ui/DateField，用戶 2026-11-12）：顯示 DD/MM/YYYY，日曆 icon 開月曆（星期日開始、標今日、揀咗實色），
 * 方向鍵 + Enter 揀日、Esc 收起；截圖時月曆開住
 */
const scheduleDateFieldCheck = (browser) =>
    check('schedule date field: DD/MM/YYYY text, month calendar popover, keyboard', async () => {
        const page = await newPage(browser, scheduleState());
        await page.goto(SCHEDULE_PARTLY);
        const field = page.getByRole('textbox', { name: '上架開始日期', exact: true });
        if ((await field.inputValue()) !== '15/11/2026')
            throw new Error(`start date shows ${await field.inputValue()}`);
        if ((await page.locator('input[type="date"]').count()) > 0)
            throw new Error('a native date input is left');
        await page.getByRole('button', { name: '選擇上架開始日期' }).click();
        const dialog = page.getByRole('dialog', { name: '選擇上架開始日期' });
        await dialog.waitFor();
        await page.getByRole('grid', { name: '2026 年 11 月' }).waitFor();
        const heads = await dialog.locator('th').allTextContents();
        if (heads.join('') !== '日一二三四五六') throw new Error(`weekdays ${heads}`);
        await dialog.getByRole('button', { name: '12/11/2026 星期四（今日）' }).waitFor();
        const focused = await page.evaluate(() =>
            document.activeElement?.getAttribute('aria-label'),
        );
        if (focused !== '15/11/2026 星期日') throw new Error(`focus on ${focused}`);
        // 月曆底部喺內容區捲動範圍入面：捲到成個月曆見到先影
        await dialog.scrollIntoViewIfNeeded();
        await page.waitForTimeout(PILL_SETTLE_MS);
        await shoot(page, 'schedule-datefield', { fullPage: true });
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        if ((await dialog.count()) > 0) throw new Error('calendar still open after Enter');
        if ((await field.inputValue()) !== '22/11/2026')
            throw new Error(`picked ${await field.inputValue()}`);
        await field.fill('31/11/2026');
        await field.press('Tab');
        const error = await page.locator('.date-error').first().textContent();
        if (error !== '日期無效，請以 DD/MM/YYYY 格式輸入') throw new Error(`error: ${error}`);
        await page.close();
    });

/** 日期欄近 viewport 底：月曆向上開；今日之前嘅日子 disabled（用戶 2026-11-12） */
const scheduleDateFieldUpCheck = (browser) =>
    check(
        'schedule date field: calendar opens upward near the bottom, past days disabled',
        async () => {
            const page = await newPage(browser, scheduleState(), { width: 1280, height: 640 });
            await page.goto(SCHEDULE_PARTLY);
            const trigger = page.getByRole('button', { name: '選擇上架開始日期' });
            await trigger.click();
            const dialog = page.getByRole('dialog', { name: '選擇上架開始日期' });
            await dialog.waitFor();
            if ((await dialog.getAttribute('data-placement')) !== 'up')
                throw new Error('calendar did not open upward');
            const [pop, field] = await Promise.all([dialog.boundingBox(), trigger.boundingBox()]);
            if (!pop || !field || pop.y + pop.height > field.y)
                throw new Error('calendar not above');
            for (const name of ['11/11/2026 星期三', '01/11/2026 星期日']) {
                const day = dialog.getByRole('button', { name });
                if ((await day.getAttribute('aria-disabled')) !== 'true')
                    throw new Error(`${name} before today is not disabled`);
            }
            const today = dialog.getByRole('button', { name: '12/11/2026 星期四（今日）' });
            if ((await today.getAttribute('aria-disabled')) !== null)
                throw new Error('today disabled');
            await page.waitForTimeout(PILL_SETTLE_MS);
            await shoot(page, 'schedule-datefield-up');
            await page.close();
        },
    );

/** 今日 = 上架日（未上架短篇「一次性全部」今日上架）：唔加格，嗰格 / 嗰行加「（今日）」 */
const scheduleTodayOverlapCheck = (browser) =>
    check('schedule: 今日 on a batch date marks that batch, no extra cell', async () => {
        const page = await newPage(browser, scheduleState());
        await page.goto(`${BASE}/dramas/lancy/schedule#love-after`);
        await page.getByRole('button', { name: '一次性全部' }).click();
        await page.getByRole('button', { name: '指定日全部' }).click();
        const listing = page.getByRole('group', { name: '上架時間軸' });
        await listing.getByText('12/11 四（今日）').waitFor();
        if ((await listing.locator('.today-cell').count()) > 0)
            throw new Error('extra 今日 cell on overlap');
        await page.mouse.move(0, 0);
        await shoot(page, 'schedule-today-overlap', { fullPage: true });
        await page.getByRole('tab', { name: '預覽' }).click();
        await page.locator('.strip.preview .day-group.today').getByText('12/11（今日）').waitFor();
        const row = page.locator('table.batches tr.today');
        if ((await row.count()) !== 1) throw new Error('today row not highlighted once');
        await page.close();
    });

/*
 * 快速套用 chip：撳完滑鼠仲喺粒 chip 上面（揀咗 + hover），之前 hover 蓋咗實色底 → 字睇唔到。
 * 揀咗：實色底白字 ≥ 4.5:1；disabled（快速套用 / 排程短篇 tab）：--muted 字淺底 ≥ 3:1，淺深色都量
 */
const presetChipCheck = (browser) =>
    check('schedule chips: pressed (hovered) and disabled chips stay readable', async () => {
        const page = await newPage(browser, loggedIn());
        await page.goto(SCHEDULE_PARTLY);
        // 「逢一三五」已刪（只剩 3 粒）：用「每日 1 集」做揀咗嘅 chip
        const mwf = page.getByRole('button', { name: '每日 1 集' });
        await mwf.click();
        if ((await mwf.getAttribute('aria-pressed')) !== 'true')
            throw new Error('preset not pressed');
        await mwf.hover();
        await assertContrast(page, mwf, 4.5, 'pressed + hovered preset');
        for (const scheme of ['light', 'dark']) {
            await page.emulateMedia({ colorScheme: scheme });
            const colours = await mwf.evaluate((el) => {
                const style = getComputedStyle(el);
                return [style.backgroundColor, style.color];
            });
            if (colours.join() !== `${PRIMARY},${ON_PRIMARY}`)
                throw new Error(`${scheme}: pressed preset is ${colours}`);
        }
        const presets = page.getByRole('group', { name: '快速套用' });
        await shoot(page, 'preset-chips', { clip: await boxOf(presets) });
        await mwf.evaluate((el) => {
            el.disabled = true;
        });
        await page.mouse.move(0, 0);
        await assertContrast(page, mwf, 3, 'disabled pressed preset');
        const daily = page.getByRole('button', { name: '每週 1 次' });
        await daily.evaluate((el) => {
            el.disabled = true;
        });
        await assertContrast(page, daily, 3, 'disabled preset');
        await shoot(page, 'preset-chips-disabled', { clip: await boxOf(presets) });
        const tab = page.getByRole('tab', { name: /戀愛二分一/ });
        await tab.evaluate((el) => {
            el.disabled = true;
        });
        await assertContrast(page, tab, 3, 'disabled arc tab');
        await page.close();
    });

/*
 * 真圖（e2e/fixtures，player 嘅 cover）：「口水多過浪花」同「蘭茜夫人劇場」有橫圖 / 碟面，
 * 截編輯頁圖片區、標題碟面、兩個列表、排程短篇 chip 嘅淺色同深色，睇框線同真圖夾唔夾
 */
const IMAGE_URL = /\/catalog\/v1\/img\//;

const assertImagesLoaded = async (page, locator, what) => {
    const urls = await locator.evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).backgroundImage.match(/url\("?(.+?)"?\)/)?.[1] ?? ''),
    );
    const real = urls.filter((url) => IMAGE_URL.test(url));
    if (real.length === 0) throw new Error(`${what}: no real image (${urls})`);
    for (const url of real) {
        const ok = await page.evaluate(async (src) => {
            const img = new Image();
            img.src = src;
            await img.decode();
            return img.naturalWidth > 0;
        }, url);
        if (!ok) throw new Error(`${what}: ${url} did not decode`);
    }
};

/** 框線：'dashed' = 2px 虛線；'none' = 冇 border、冇 box-shadow 框 */
const assertFrames = async (locator, expected, what) => {
    const styles = await locator.evaluateAll((els) =>
        els.map((el) => {
            const style = getComputedStyle(el);
            return `${style.borderTopStyle}|${style.borderTopWidth}|${style.boxShadow}`;
        }),
    );
    if (styles.length === 0) throw new Error(`${what}: nothing to check`);
    const ok = (s) => (expected === 'dashed' ? s.startsWith('dashed|2px') : s === 'none|0px|none');
    const bad = styles.filter((s) => !ok(s));
    if (bad.length > 0) throw new Error(`${what}: expected ${expected} frame, got ${bad}`);
};

const realImagesCheck = (browser) =>
    check('real covers: editor slots, title disc, lists and schedule chips', async () => {
        const page = await newPage(browser, loggedIn({ realImages: true }));
        for (const [path, name] of [
            ['/dramas/lancy', 'drama'],
            ['/shows/waves', 'show'],
        ]) {
            await page.goto(`${BASE}${path}`);
            const media = page.locator('.media').first();
            await media.locator('.img-slot:not(.empty)').nth(1).waitFor();
            await assertImagesLoaded(page, media.locator('.thumb'), `${name} image slots`);
            await shoot(page, `image-slots-real-${name}`, { clip: await boxOf(media) });
            await assertFrames(media.locator('.img-slot'), 'dashed', `${name} image slots`);
            const title = page.locator('.title-row').first();
            await assertImagesLoaded(page, title.locator('.thumb'), `${name} title disc`);
            await assertFrames(title.locator('.thumb'), 'none', `${name} title disc`);
            await shoot(page, `title-disc-real-${name}`, { clip: await boxOf(title) });
        }
        // 裁切 dialog：用真圖揀檔，原圖虛線框 + 三個候選 + 播放器預覽（碟面 = 圓碟）
        await page.goto(`${BASE}/dramas/lancy`);
        for (const [slot, label] of [
            ['disc', '碟面'],
            ['tile', '橫圖'],
        ]) {
            const chooser = page.waitForEvent('filechooser');
            await page.getByRole('button', { name: `更換${label}` }).click();
            await (
                await chooser
            ).setFiles(fileURLToPath(new URL(`./fixtures/lancy-${slot}.webp`, import.meta.url)));
            const dialog = page.getByRole('dialog', { name: new RegExp(`^更換${label}（`) });
            await dialog.getByRole('button', { name: '置中裁切' }).waitFor();
            await assertFrames(dialog.locator('.src-frame'), 'dashed', `${slot} source frame`);
            await dialog
                .locator(slot === 'disc' ? '.pv .pdisc canvas' : '.pv .ptile canvas')
                .waitFor();
            await shoot(page, `upload-preview-real-${slot}`, { clip: await boxOf(dialog) });
            await dialog.getByRole('button', { name: '取消' }).click();
            await dialog.waitFor({ state: 'detached' });
        }
        for (const [path, name] of [
            ['/shows', 'shows'],
            ['/dramas', 'dramas'],
        ]) {
            await page.goto(`${BASE}${path}`);
            await page.locator('.list .thumb').first().waitFor();
            await assertImagesLoaded(page, page.locator('.list .thumb'), `${name} list`);
            await assertFrames(page.locator('.list .thumb:not(.blank)'), 'none', `${name} list`);
            await shoot(page, `${name}-real`);
        }
        await page.goto(`${BASE}/dramas/lancy/schedule#half`);
        const tabs = page.getByRole('tablist', { name: /短篇/ });
        await tabs.waitFor();
        await assertImagesLoaded(page, tabs.locator('.thumb'), 'schedule arc chips');
        await assertFrames(tabs.locator('.thumb'), 'none', 'schedule arc chips');
        await shoot(page, 'schedule-chips-real', { clip: await boxOf(tabs) });
        await page.close();
    });

/** 資料夾唔見咗：編輯頁「音訊來源」出警告 + 揀資料夾 dropdown +「配對」掣（截圖畀用戶睇位置） */
const missingFolderCheck = (browser) =>
    check('missing R2 folder: warning, folder dropdown and 配對 on the drama editor', async () => {
        const page = await newPage(browser, loggedIn({ missingFolder: true }));
        await page.goto(`${BASE}/dramas/golden`);
        const field = page.locator('#folder');
        await field.getByText('在 R2 找不到 黃金少年/').waitFor();
        const select = field.getByRole('combobox', { name: '選擇未配對的資料夾…' });
        await select.locator('option', { hasText: '少爺占系列/' }).waitFor({ state: 'attached' });
        const pair = field.getByRole('button', { name: '配對' });
        if (!(await pair.isDisabled())) throw new Error('配對 enabled before picking a folder');
        await shoot(page, 'missing-folder-page', { fullPage: true });
        await assertIcon(pair, 'link-2', '配對');
        await select.selectOption('黃金少年 第一季');
        if (await pair.isDisabled()) throw new Error('配對 still disabled after picking');
        const box = await boxOf(field);
        const pad = 12;
        await shoot(page, 'missing-folder', {
            clip: {
                x: box.x - pad,
                y: box.y - pad,
                width: box.width + pad * 2,
                height: box.height + pad * 2,
            },
        });
        await page.close();
    });

/** lucide icon（aria-hidden）喺唔喺 locator 入面；文字唔可以再有 ← → ▾ ▴ */
const assertIcon = async (locator, icon, what) => {
    const found = await locator.evaluate(
        (el, name) => el.querySelector(`svg.lucide-${name}[aria-hidden="true"]`) !== null,
        icon,
    );
    if (!found) throw new Error(`${what}: no ${icon} icon`);
    const text = await locator.innerText();
    if (/[←→▾▴]/.test(text)) throw new Error(`${what}: arrow character left in "${text}"`);
};

const clipAround = async (locator, pad = 12) => {
    const box = await boxOf(locator);
    return {
        x: box.x - pad,
        y: box.y - pad,
        width: box.width + pad * 2,
        height: box.height + pad * 2,
    };
};

/** 8 組日期（即時上線 + 7 日）：確認發佈時間線收起，出「查看全部」 */
const longTimeline = () => {
    const days = ['now', ...[17, 18, 19, 20, 21, 22, 23].map((d) => `2026-11-${d}`)];
    const groups = days.map((when, i) => ({
        when,
        items: [
            {
                kind: 'newArc',
                when,
                entry: { kind: 'dramas', id: 'lancy', name: '蘭茜夫人劇場' },
                arc: { id: 'lancy-02', name: '我心不死', label: `我心不死 ${i + 1}` },
                detail: { episodes: { first: i + 1, last: i + 1 } },
            },
        ],
    }));
    return { items: groups.flatMap((g) => g.items), timeline: groups };
};

const actionIconsCheck = (browser) =>
    check('action links / buttons carry outline icons (no arrow characters)', async () => {
        const state = loggedIn();
        // 6 個短篇：列表收起，出「展開全部」
        state.entries.find((e) => e.id === 'golden').definition.arcs = [1, 2, 3, 4, 5, 6].map(
            (n) => ({ id: `s${n}`, name: `Season ${n}`, episodes: 10 }),
        );
        const page = await newPage(browser, state);
        // ScanBar「處理待辦」+ UnpublishedNote「前往發佈」
        await page.goto(`${BASE}/dramas`);
        const go = page.getByRole('link', { name: '處理待辦' });
        await go.waitFor();
        await assertIcon(go, 'arrow-right', '處理待辦');
        const publish = page.getByRole('link', { name: '前往發佈' });
        await assertIcon(publish, 'arrow-right', '前往發佈');
        await shoot(page, 'icon-scan-unpublished', {
            clip: { ...(await clipAround(page.locator('.scan-bar'))), height: 180 },
        });
        // 展開全部 / 收起
        const expand = page.getByRole('button', { name: '展開全部 6 個短篇' });
        await assertIcon(expand, 'chevron-down', '展開全部');
        await shoot(page, 'icon-arcs-expand', {
            clip: await clipAround(page.locator('.arcs', { has: expand })),
        });
        await expand.click();
        const collapse = page.getByRole('button', { name: '收起' });
        await assertIcon(collapse, 'chevron-up', '收起');
        await shoot(page, 'icon-arcs-collapse', {
            clip: await clipAround(page.locator('.arcs', { has: collapse })),
        });
        // 「返回待辦」（flow bar）
        await page.goto(
            `${BASE}/dramas/lancy/arcs?from=todos&todo=newArc%3Alancy%3Alancy-02#lancy-02`,
        );
        const back = page
            .getByRole('region', { name: '處理待辦' })
            .getByRole('link', { name: '返回待辦' });
        await back.waitFor();
        await assertIcon(back, 'arrow-left', '返回待辦');
        await shoot(page, 'icon-flow-back', { clip: await clipAround(page.locator('.flow-bar')) });
        // 「查看全部」（確認發佈時間線）
        await page.route('**/api/changes', (route) =>
            route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    base: null,
                    changes: longTimeline(),
                    validation: { ok: true, episodeCount: 102 },
                }),
            }),
        );
        await page.goto(`${BASE}/publish`);
        const all = page.getByRole('button', { name: /查看全部/ });
        await all.waitFor();
        await assertIcon(all, 'chevron-down', '查看全部');
        await all.scrollIntoViewIfNeeded();
        await shoot(page, 'icon-timeline-all', {
            clip: await clipAround(page.locator('.timeline li.more')),
        });
        // 「重新登入（新分頁）」：儲存時 401
        await page.route(/\/api\/entries\/shows\/night$/, (route, request) =>
            request.method() === 'PUT'
                ? route.fulfill({
                      status: 401,
                      contentType: 'application/json',
                      body: '{"error":"x"}',
                  })
                : route.fallback(),
        );
        await page.goto(`${BASE}/shows/night`);
        await page.getByRole('textbox', { name: '簡介' }).fill('x');
        await page.getByRole('button', { name: '儲存' }).click();
        const relogin = page.getByRole('link', { name: '重新登入（新分頁）' });
        await relogin.waitFor();
        await assertIcon(relogin, 'external-link', '重新登入');
        await shoot(page, 'icon-relogin', {
            clip: await clipAround(page.locator('.note', { has: relogin })),
        });
        await page.close();
    });

const showEditorCheck = (browser) =>
    check(
        'show editor: 設定播放時間 reveals the roller, each roller under its own box',
        async () => {
            const page = await newPage(browser, loggedIn());
            await page.goto(`${BASE}/shows/night`);
            await page.getByRole('switch', { name: '狀態' }).waitFor();
            if (await page.getByRole('button', { name: /開始時間/ }).isVisible())
                throw new Error('time boxes shown without 設定播放時間');
            await page.getByRole('checkbox', { name: '設定播放時間' }).check();
            // 完結時間嘅 roller 要喺完結框下面（唔係開始框下面）
            const end = page.getByRole('button', { name: /完結時間/ });
            await end.click();
            const endBox = await end.boundingBox();
            const pop = await page.getByRole('dialog', { name: '完結時間' }).boundingBox();
            if (
                !endBox ||
                !pop ||
                Math.abs(pop.x - endBox.x) > 2 ||
                pop.y < endBox.y + endBox.height
            )
                throw new Error(
                    `end roller not under the end box: ${JSON.stringify({ endBox, pop })}`,
                );
            await shoot(page, 'show-editor-end-roller');
            await page.getByRole('button', { name: /開始時間/ }).click();
            await shoot(page, 'show-editor', { fullPage: true });
            await page.close();
        },
    );

/** S-823：窄畫面（nav 自動收合 / 最窄橫向）完結 roller 唔可以超出 panel 右邊 */
const NARROW_WIDTHS = [1024, 720];

const narrowRollerCheck = (browser) =>
    check('show editor: end roller stays inside the panel on narrow screens', async () => {
        for (const width of NARROW_WIDTHS) {
            const page = await newPage(browser, loggedIn(), { width, height: 768 });
            await page.goto(`${BASE}/shows/night`);
            await page.getByRole('checkbox', { name: '設定播放時間' }).check();
            await page.getByRole('button', { name: /完結時間/ }).click();
            const pop = page.getByRole('dialog', { name: '完結時間' });
            await pop.scrollIntoViewIfNeeded();
            const box = await boxOf(pop);
            const card = await boxOf(page.locator('.card', { has: pop }));
            if (box.x + box.width > card.x + card.width || box.x + box.width > width)
                throw new Error(
                    `${width}px: roller ${JSON.stringify(box)} past ${JSON.stringify(card)}`,
                );
            await shoot(page, `show-editor-end-roller-${width}`);
            await page.close();
        }
    });

/** 1×1 PNG（Safari 路徑：canvas 出 PNG → wasm encoder） */
const PNG_1PX = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
);

const imageCheck = (browser) =>
    check(
        'PNG upload: preview dialog, then WebP via the wasm encoder when canvas cannot',
        async () => {
            const state = loggedIn();
            const page = await newPage(browser, state);
            // 扮 Safari：canvas.toBlob('image/webp') 出 PNG
            await page.addInitScript(() => {
                const native = HTMLCanvasElement.prototype.toBlob;
                HTMLCanvasElement.prototype.toBlob = function (done, _type, quality) {
                    native.call(this, done, 'image/png', quality);
                };
            });
            await page.goto(`${BASE}/dramas/lancy`);
            // 基本資料：類型鎖住 = 實色 pill、檔名模板例子
            await page.getByText('例：01 - 戀愛二分一.m4a').waitFor();
            await page.locator('.pill.solid', { hasText: '短篇集' }).waitFor();
            await shoot(page, 'drama-basic');
            await shoot(page, 'image-slots', { clip: await boxOf(page.locator('.media')) });
            const chooser = page.waitForEvent('filechooser');
            await page.getByRole('button', { name: '上載碟面' }).click();
            await (
                await chooser
            ).setFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG_1PX });
            const dialog = page.getByRole('dialog', { name: '上載碟面（600 × 600）' });
            // 原圖資料 + 原圖細過輸出：黃色放大警告（唔阻上載）
            await dialog.getByText('原圖 1 × 1 · PNG').waitFor();
            await dialog.getByText(/將放大 600 倍/).waitFor();
            await dialog.getByRole('group', { name: '候選' }).waitFor();
            await shoot(page, 'image-preview');
            await dialog.getByRole('button', { name: '上載' }).click();
            await dialog.waitFor({ state: 'detached' });
            const body = state.assets[0];
            if (
                !body ||
                body.subarray(0, 4).toString() !== 'RIFF' ||
                body.subarray(8, 12).toString() !== 'WEBP'
            )
                throw new Error('uploaded body is not WebP');
            await page.close();
        },
    );

/** 元素嘅 bounding box；{ height } = 只截上面嗰段（S-829：冇用嘅 x 參數已刪） */
const boxOf = async (locator, { height } = {}) => {
    const box = await locator.boundingBox();
    if (!box) throw new Error('element not visible');
    return height === undefined ? box : { ...box, height };
};

const navCheck = (browser) =>
    check(
        'nav v4: collapse moves the toggle below the theme button, remembered, tooltip visible',
        async () => {
            const page = await newPage(browser, loggedIn());
            await page.goto(`${BASE}/dramas`);
            await page.getByText('已掃描 R2').waitFor();
            await shoot(page, 'nav-full');
            // 展開：主題三掣 + 收合同一行（收合排最後）
            const seg = await boxOf(page.getByRole('group', { name: '顯示模式' }));
            const collapse = await boxOf(page.getByRole('button', { name: '收合選單' }));
            if (Math.abs(seg.y - collapse.y) > 8 || collapse.x <= seg.x)
                throw new Error('collapse button is not after the theme switch on the same row');
            await page.getByRole('button', { name: '收合選單' }).click();
            // animation 中途：停喺 50ms（ease-out，畫面約一半位置）截圖，再放佢播完
            const paused = await page.evaluate(() =>
                // 停咗嘅 animation 唔會 settle：flip.ts 超時收 .flipping，截圖前補返（= 50ms 嗰格嘅樣）
                (document.querySelector('.nav')?.classList.add('flipping'),
                document.getAnimations()).map((animation) => {
                    animation.pause();
                    animation.currentTime = 50;
                    const target = animation.effect?.target;
                    return `${target?.dataset?.flip}:${animation.effect.getComputedTiming().duration}`;
                }),
            );
            if (!paused.includes('toggle:220')) throw new Error(`no FLIP on toggle: ${paused}`);
            await page.screenshot({ path: `${OUT}/nav-flip-mid.png` });
            await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
            await page.reload();
            const expand = page.getByRole('button', { name: '展開選單' });
            const cycle = await boxOf(page.getByRole('button', { name: /主題：/ }));
            const below = await boxOf(expand);
            if (below.y <= cycle.y) throw new Error('expand button is not below the theme button');
            await page.getByRole('link', { name: '節目' }).hover();
            await page.locator('.tip-pop', { hasText: '節目' }).waitFor();
            await expand.hover();
            const tip = await boxOf(page.locator('.tip-pop', { hasText: '展開選單' }));
            const viewport = page.viewportSize();
            // 喺掣右邊、成個喺視窗入面；fixed + z-index 40 喺 body（唔會被 nav / panel 遮）
            if (tip.x < below.x + below.width || tip.x + tip.width > viewport.width || tip.y < 0)
                throw new Error(`tooltip clipped: ${JSON.stringify({ tip, below })}`);
            const onTop = await page.evaluate(() => {
                const bubble = document.querySelector('.tip-pop');
                return bubble?.parentElement === document.body && getComputedStyle(bubble).zIndex;
            });
            if (onTop !== '40') throw new Error('tooltip is not on top of nav / panel');
            const logo = page.locator('.logo-mini img');
            if ((await logo.getAttribute('src')) !== '/icon-192.png')
                throw new Error('collapsed nav does not show the app icon');
            if (!(await logo.evaluate((img) => img.complete && img.naturalWidth > 0)))
                throw new Error('app icon failed to load');
            // 完整 app icon（原本圓角方形）：1:1 唔變形、冇圓形底、冇裁切（img 佔滿成個 link）
            const shape = await logo.evaluate((img) => {
                const link = getComputedStyle(img.parentElement);
                const box = img.getBoundingClientRect();
                const outer = img.parentElement.getBoundingClientRect();
                return {
                    width: getComputedStyle(img).width,
                    height: getComputedStyle(img).height,
                    fit: getComputedStyle(img).objectFit,
                    radius: link.borderRadius,
                    background: link.backgroundColor,
                    img: [box.width, box.height],
                    link: [outer.width, outer.height],
                };
            });
            if (shape.width !== shape.height || shape.fit !== 'contain')
                throw new Error(`app icon is distorted: ${JSON.stringify(shape)}`);
            if (
                shape.radius === '50%' ||
                shape.background !== 'rgba(0, 0, 0, 0)' ||
                shape.img.join() !== shape.link.join()
            )
                throw new Error(`app icon has a badge or is cropped: ${JSON.stringify(shape)}`);
            await shoot(page, 'nav-mini');
            await shoot(page, 'nav-mini-logo', {
                clip: await boxOf(page.locator('.nav'), { height: 140 }),
            });
            await page.close();
        },
    );

const UNRELEASED_ARC = 'love-after';
const PRIMARY = 'rgb(30, 123, 192)';
const ON_PRIMARY = 'rgb(255, 255, 255)';

const unreleasedScheduleCheck = (browser) =>
    check(
        'schedule tab: disabled arc without a schedule is 未上架 (no grey ✓), chip solid primary',
        async () => {
            const page = await newPage(browser, loggedIn());
            await page.goto(`${BASE}/dramas/lancy/schedule#${UNRELEASED_ARC}`);
            const tab = page.getByRole('tab', { name: /戀愛後二分一/ });
            await tab.waitFor();
            if ((await tab.getAttribute('aria-selected')) !== 'true')
                throw new Error('arc not selected');
            await page.locator('.strip-unreleased').waitFor();
            if ((await page.locator('.seg-batch.listed').count()) > 0)
                throw new Error('disabled unscheduled arc shows released batches');
            for (const scheme of ['light', 'dark']) {
                await page.emulateMedia({ colorScheme: scheme });
                await tab.hover();
                const colours = await tab.evaluate((el) => {
                    const style = getComputedStyle(el);
                    return [style.backgroundColor, style.color];
                });
                if (colours.join() !== `${PRIMARY},${ON_PRIMARY}`)
                    throw new Error(`${scheme}: selected chip is ${colours}`);
            }
            await page.mouse.move(0, 0);
            await shoot(page, 'schedule-unreleased', { fullPage: true });
            await page.close();
        },
    );

const TOGGLE_ON = 'rgb(31, 122, 77)';
const TOGGLE_OFF = 'rgb(194, 51, 58)';

const toggleHoverCheck = (browser) =>
    check('status toggle keeps green / red on hover (light + dark)', async () => {
        const page = await newPage(browser, loggedIn());
        for (const [path, colour] of [
            ['/shows/night', TOGGLE_ON],
            ['/shows/new', TOGGLE_OFF],
        ]) {
            await page.goto(`${BASE}${path}`);
            const toggle = page.getByRole('switch', { name: '狀態' });
            for (const scheme of ['light', 'dark']) {
                await page.emulateMedia({ colorScheme: scheme });
                await toggle.hover();
                const bg = await toggle.evaluate((el) => getComputedStyle(el).backgroundColor);
                if (bg !== colour) throw new Error(`${path} ${scheme}: hover background ${bg}`);
            }
            const box = await boxOf(toggle);
            const clip = {
                x: box.x - 16,
                y: box.y - 40,
                width: box.width + 32,
                height: box.height + 56,
            };
            await shoot(page, `toggle-hover-${colour === TOGGLE_ON ? 'on' : 'off'}`, { clip });
        }
        await page.close();
    });

const savebarCheck = (browser) =>
    check('arc editor savebar: 復原 at the far left, dirty note + save on the right', async () => {
        const page = await newPage(browser, loggedIn());
        await page.goto(`${BASE}/dramas/lancy/arcs#half`);
        await page.getByRole('textbox', { name: '簡介' }).first().fill('新簡介');
        const bar = page.locator('.savebar').filter({ hasText: '有未儲存的變更' });
        await bar.scrollIntoViewIfNeeded();
        const revert = await boxOf(bar.getByRole('button', { name: '復原' }));
        const note = await boxOf(bar.getByText(/有未儲存的變更/));
        const whole = await boxOf(bar);
        if (revert.x - whole.x > 4) throw new Error('復原 is not at the far left');
        if (note.x < whole.x + whole.width / 2) throw new Error('dirty note is not on the right');
        const pad = 12;
        await shoot(page, 'arc-savebar', {
            clip: {
                x: whole.x - pad,
                y: whole.y - pad,
                width: whole.width + pad * 2,
                height: whole.height + pad * 2,
            },
        });
        await page.close();
    });

const todoRowCheck = (browser) =>
    check('todo matrix: folder ✓ on new arc, whole row opens the arc (flow bar kept)', async () => {
        const page = await newPage(browser, loggedIn());
        await page.goto(BASE);
        await page.getByLabel('我心不死：資料夾 已完成').waitFor();
        const row = page.getByRole('row', { name: /我心不死/ });
        await row.hover();
        await shoot(page, 'update-row-hover');
        await row.locator('td.ok').first().click();
        await page.waitForURL(
            /\/dramas\/lancy\/arcs\?from=todos&todo=newArc%3Alancy%3Alancy-02#lancy-02$/,
        );
        await page.getByRole('region', { name: '處理待辦' }).waitFor();
        await page.getByRole('button', { name: '儲存並返回待辦' }).waitFor();
        await page.close();
    });

const newShowCheck = (browser) =>
    check(
        'new show: save without images, back to /shows with the new row; existing show stays',
        async () => {
            const state = loggedIn();
            const page = await newPage(browser, state);
            await page.goto(`${BASE}/shows`);
            await page.getByRole('button', { name: '新增節目' }).click();
            await page.waitForURL(`${BASE}/shows/new`);
            await page.getByRole('textbox', { name: /ID/ }).fill('abc');
            await page.getByRole('textbox', { name: '名稱' }).fill('新節目測試');
            await page.getByRole('button', { name: '儲存' }).click();
            await page.waitForURL(`${BASE}/shows`);
            await page.getByText('已新增「abc」').waitFor();
            await page.getByText('新節目測試').waitFor();
            await page.goto(`${BASE}/shows/night`);
            await page.getByRole('textbox', { name: '簡介' }).fill('x');
            await page.getByRole('button', { name: '儲存' }).click();
            await page.getByText(/有未儲存的變更/).waitFor({ state: 'detached' });
            if (page.url() !== `${BASE}/shows/night`)
                throw new Error('existing show left the editor');
            await page.close();
        },
    );

const arcLinkCheck = (browser) =>
    check(
        'drama list: arc name opens the arc in the arcs tab, row still opens the drama',
        async () => {
            const page = await newPage(browser, loggedIn());
            await page.goto(`${BASE}/dramas`);
            const arc = page.getByRole('link', { name: '我心不死' });
            await arc.hover();
            const line = await arc.evaluate((el) => getComputedStyle(el).textDecorationLine);
            if (line !== 'underline') throw new Error(`arc link hover decoration: ${line}`);
            await shoot(page, 'dramas-arc-hover');
            await arc.click();
            await page.waitForURL(`${BASE}/dramas/lancy/arcs#lancy-02`);
            await page.goto(`${BASE}/dramas`);
            await page.getByText('蘭茜夫人劇場').first().click();
            await page.waitForURL(`${BASE}/dramas/lancy`);
            await page.close();
        },
    );

/* 未上架（灰，從未上過架）vs 已下架（紅，上過架）：短篇 tab、廣播劇列表（短篇行 + 其餘摘要 + 灰點分隔線） */
const statusMixState = () => loggedIn({ statusMix: true });

const pillOf = (row) => row.locator('.pills .pill');

/** 狀態 pill 唔可以有 hover 效果（用戶規則）：hover 前後底色 / 字色一樣 */
const assertNoHover = async (page, pill, what) => {
    const coloursOf = () =>
        pill.evaluate((el) => {
            const style = getComputedStyle(el);
            return `${style.backgroundColor} ${style.color}`;
        });
    await page.mouse.move(0, 0);
    const before = await coloursOf();
    await pill.hover();
    const after = await coloursOf();
    if (before !== after) throw new Error(`${what} pill changes on hover: ${before} → ${after}`);
};

const arcStatusCheck = (browser) =>
    check(
        'arcs tab: never-listed disabled arc is grey 未上架, listed-before one red 已下架',
        async () => {
            const page = await newPage(browser, statusMixState());
            await page.goto(`${BASE}/dramas/sammy/arcs`);
            // published 由列表資料（GET /api/entries）嚟：載入完先由「已下架」轉灰色「未上架」
            for (const id of ['fantasy', 'camp'])
                await page
                    .locator(`li#${id} .pills .pill.unlisted`, { hasText: '未上架' })
                    .waitFor({ timeout: 5000 });
            const diary = pillOf(page.locator('li#diary'));
            if ((await diary.textContent()) !== '已下架') throw new Error('diary: not 已下架');
            await assertNoHover(page, pillOf(page.locator('li#fantasy')), '未上架');
            await page.mouse.move(0, 0);
            await shoot(page, 'arc-status-unlisted', { fullPage: true });
            await page.close();
        },
    );

const dramaListStatusCheck = (browser) =>
    check(
        'drama list: arc lines 未上架 / 已下架, 其餘 summary, grey dot + 未上架 / 已下架 divider',
        async () => {
            const page = await newPage(browser, statusMixState());
            await page.goto(`${BASE}/dramas`);
            const row = page.locator('li.drama-row', { hasText: '森美小儀系列' });
            await row.waitFor();
            const unlisted = row.locator('.pill.unlisted', { hasText: '未上架' });
            if ((await unlisted.count()) !== 2) throw new Error('expected 2 未上架 arc lines');
            if ((await row.locator('.pill.bad', { hasText: '已下架' }).count()) !== 1)
                throw new Error('expected 1 已下架 arc line');
            await row.getByText('其餘 6 個已上架').waitFor();
            await page.getByText(/^未上架 \/ 已下架（1）/).waitFor();
            const fresh = page.locator('li.drama-row', { hasText: '新劇集' });
            if ((await fresh.locator('.thumb.st-unlisted').count()) !== 1)
                throw new Error('never-published drama has no grey dot');
            await page.getByRole('group', { name: '圖例' }).getByText('未上架').waitFor();
            await assertNoHover(page, unlisted.first(), '未上架');
            await page.mouse.move(0, 0);
            await shoot(page, 'drama-list-status', { fullPage: true });
            await page.close();
        },
    );

const arcMemoryCheck = (browser) =>
    check(
        'drama tabs remember the arc: 短篇 → 排程 selects it, 排程 → 短篇 expands it',
        async () => {
            const page = await newPage(browser, statusMixState());
            await page.goto(`${BASE}/dramas/sammy/arcs`);
            await page.getByRole('button', { name: '展開「大衛營」' }).click();
            await page.getByRole('link', { name: '排程', exact: true }).click();
            await page.waitForURL(`${BASE}/dramas/sammy/schedule#camp`);
            const chip = page.getByRole('tab', { name: /大衛營/ });
            await chip.waitFor();
            if ((await chip.getAttribute('aria-selected')) !== 'true')
                throw new Error('大衛營 chip not selected');
            await page.mouse.move(0, 0);
            await shoot(page, 'arc-memory', { fullPage: true });
            await page.getByRole('tab', { name: /開心日記/ }).click();
            await page.getByRole('link', { name: /^短篇（/ }).click();
            await page.waitForURL(`${BASE}/dramas/sammy/arcs#diary`);
            const toggle = page.getByRole('button', { name: '展開「開心日記」' });
            if ((await toggle.getAttribute('aria-expanded')) !== 'true')
                throw new Error('開心日記 not expanded in the arcs tab');
            await page.close();
        },
    );

/** 短篇 tab：嗰行展開咗（aria-expanded + 編輯欄位見到）而且喺畫面入面 */
const assertArcExpanded = async (page, name) => {
    const toggle = page.getByRole('button', { name: `展開「${name}」` });
    await toggle.waitFor();
    if ((await toggle.getAttribute('aria-expanded')) !== 'true')
        throw new Error(`${name} not expanded in the arcs tab`);
    const field = page.getByRole('textbox', { name: /^名稱/ });
    if ((await field.inputValue()) !== name) throw new Error(`open editor is not ${name}`);
    if (
        (await page
            .getByRole('button', { name: /^展開「/ })
            .and(page.locator('[aria-expanded="true"]'))
            .count()) !== 1
    )
        throw new Error('more than one arc expanded');
    const row = page.locator('li.arc-line.open');
    const inView = await row.evaluate((el) => {
        const box = el.getBoundingClientRect();
        return box.top >= 0 && box.bottom <= window.innerHeight;
    });
    if (!inView) throw new Error(`${name} row is outside the viewport`);
};

const arcMemoryBackCheck = (browser) =>
    check(
        '排程 → 短篇: the arc picked in 排程 is expanded (not just scrolled to), replacing an earlier one',
        async () => {
            const page = await newPage(browser, statusMixState());
            // ① 排程揀非預設 chip → 短篇
            await page.goto(`${BASE}/dramas/sammy/schedule`);
            await page.getByRole('tab', { name: /開心日記/ }).click();
            await page.getByRole('link', { name: /^短篇（/ }).click();
            await page.waitForURL(`${BASE}/dramas/sammy/arcs#diary`);
            await assertArcExpanded(page, '開心日記');
            // ② 短篇已展開另一個（大衛營）→ 排程揀森美幻想劇 → 返短篇 = 森美幻想劇
            await page.getByRole('button', { name: '展開「大衛營」' }).click();
            await page.getByRole('link', { name: '排程', exact: true }).click();
            await page.waitForURL(`${BASE}/dramas/sammy/schedule#camp`);
            await page.getByRole('tab', { name: /森美幻想劇/ }).click();
            await page.getByRole('link', { name: /^短篇（/ }).click();
            await page.waitForURL(`${BASE}/dramas/sammy/arcs#fantasy`);
            await assertArcExpanded(page, '森美幻想劇');
            await page.mouse.move(0, 0);
            // 等 scrollIntoView（smooth）停定先影，淺色 / 深色同一個位置
            await page.waitForFunction(
                () =>
                    new Promise((resolve) => {
                        const y = window.scrollY;
                        setTimeout(() => resolve(window.scrollY === y), 300);
                    }),
            );
            await shoot(page, 'arc-memory-back');
            // ③ W-717：短篇展開開心日記（最底）→ 排程（chip 唔郁）→ 捲返頂 → 短篇：hash 一樣都要捲去嗰行
            await page.getByRole('button', { name: '展開「開心日記」' }).click();
            await page.getByRole('link', { name: '排程', exact: true }).click();
            await page.waitForURL(`${BASE}/dramas/sammy/schedule#diary`);
            await page.getByRole('tab', { name: /開心日記/ }).waitFor();
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.getByRole('link', { name: /^短篇（/ }).click();
            await page.waitForURL(`${BASE}/dramas/sammy/arcs#diary`);
            // scrollIntoView（block: center）：嗰行要捲到畫面中間一帶，唔係淨係啱啱擠入畫面底
            await page.waitForFunction(
                () => {
                    const row = document.querySelector('li.arc-line.open');
                    if (!row) return false;
                    const box = row.getBoundingClientRect();
                    const middle = (box.top + box.bottom) / 2;
                    return Math.abs(middle - window.innerHeight / 2) < window.innerHeight / 4;
                },
                undefined,
                { timeout: 5000 },
            );
            await assertArcExpanded(page, '開心日記');
            await page.close();
        },
    );

const arcMemoryReloadCheck = (browser) =>
    check(
        'S-846: picked chip / expanded arc go into the URL (replace) and survive a reload',
        async () => {
            const page = await newPage(browser, statusMixState());
            await page.goto(`${BASE}/dramas`);
            await page.goto(`${BASE}/dramas/sammy/schedule`);
            await page.getByRole('tab', { name: /大衛營/ }).click();
            await page.getByRole('tab', { name: /開心日記/ }).click();
            await page.waitForURL(`${BASE}/dramas/sammy/schedule#diary`);
            await page.reload();
            const chip = page.getByRole('tab', { name: /開心日記/ });
            await chip.waitFor();
            if ((await chip.getAttribute('aria-selected')) !== 'true')
                throw new Error('開心日記 chip not selected after reload');
            // scrollIntoView 記錄：轉 tab 要捲去記住嘅短篇；之後撳展開（hash quiet 寫入）唔可以捲
            await page.evaluate(() => {
                window.__scrolled = [];
                const original = Element.prototype.scrollIntoView;
                Element.prototype.scrollIntoView = function scrollIntoView(options) {
                    window.__scrolled.push(this.id);
                    return original.call(this, options);
                };
            });
            await page.getByRole('link', { name: /^短篇（/ }).click();
            await page.waitForURL(`${BASE}/dramas/sammy/arcs#diary`);
            await page.waitForFunction(() => window.__scrolled.includes('diary'));
            await page.evaluate(() => {
                window.__scrolled = [];
            });
            await page.getByRole('button', { name: '展開「冬日戀曲」' }).click();
            await page.waitForURL(`${BASE}/dramas/sammy/arcs#s6`);
            await page.waitForTimeout(300);
            const scrolled = await page.evaluate(() => window.__scrolled);
            if (scrolled.length > 0) throw new Error(`expanding scrolled to ${scrolled.join()}`);
            await page.reload();
            await assertArcExpanded(page, '冬日戀曲');
            // replace：上一頁直接返去廣播劇列表，唔會逐個 chip / 短篇行返轉頭
            await page.goBack();
            await page.goBack();
            await page.waitForURL(`${BASE}/dramas`);
            await page.close();
        },
    );

const reducedMotionCheck = (browser) =>
    check('nav collapse switches instantly with reduced motion (no animation)', async () => {
        const page = await newPage(browser, loggedIn());
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(`${BASE}/dramas`);
        await page.getByRole('button', { name: '收合選單' }).click();
        const running = await page.evaluate(() => document.getAnimations().length);
        if (running !== 0) throw new Error(`${running} animations with reduced motion`);
        await page.getByRole('button', { name: '展開選單' }).waitFor();
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.getByRole('button', { name: '展開選單' }).click();
        const moving = await page.evaluate(() => document.getAnimations().length);
        if (moving === 0) throw new Error('no FLIP animation without reduced motion');
        await page.close();
    });

const autoNavCheck = (browser) =>
    check('nav collapses automatically under 1100px', async () => {
        const page = await newPage(browser, loggedIn(), { width: 1024, height: 768 });
        await page.goto(`${BASE}/dramas/lancy`);
        await page.getByRole('button', { name: '展開選單' }).waitFor();
        await page.close();
    });

const themeCheck = (browser) =>
    check(
        'manual dark theme overrides a light system, persists and applies before paint',
        async () => {
            const page = await newPage(browser, loggedIn());
            await page.emulateMedia({ colorScheme: 'light' });
            await page.goto(`${BASE}/history`);
            await page.getByRole('button', { name: '深色' }).click();
            await page.reload();
            const theme = await page.evaluate(() => document.documentElement.dataset.theme);
            if (theme !== 'dark') throw new Error(`data-theme after reload: ${theme}`);
            const panel = await page
                .locator('.content')
                .evaluate((el) => getComputedStyle(el).backgroundColor);
            if (panel !== 'rgb(20, 29, 41)') throw new Error(`panel is ${panel}, not dark`);
            await page.getByRole('heading', { name: '發佈 / 部署' }).waitFor();
            await page.screenshot({ path: `${OUT}/theme-manual-dark.png` });
            await page.getByRole('button', { name: '跟隨系統' }).click();
            if (await page.evaluate(() => document.documentElement.hasAttribute('data-theme')))
                throw new Error('跟系統 should clear data-theme');
            await page.close();
        },
    );

/* ---------- Phase 4（mockup _mockups_/admin-phase4） ---------- */

const r2AutoCropCheck = (browser) =>
    check(
        'R2 auto crop: empty drama slots fill from cd cover / cover photo in one save',
        async () => {
            const state = loggedIn({ r2Covers: true });
            const page = await newPage(browser, state);
            await page.goto(`${BASE}/dramas/lancy`);
            const media = page.locator('.media').first();
            await media.getByText('由 R2 cd cover.webp 自動裁切').waitFor();
            await media.getByText('由 R2 cover photo.webp 自動裁切').waitFor();
            await media.locator('.img-slot:not(.empty)').nth(1).waitFor();
            const saves = state.puts.filter((put) => put.id === 'lancy');
            if (saves.length !== 1 || Object.keys(saves[0].body.images).length !== 2)
                throw new Error(`expected one PUT with two images, got ${JSON.stringify(saves)}`);
            if (state.assets.length !== 2)
                throw new Error(`uploaded ${state.assets.length} assets`);
            await shoot(page, 'r2-auto-crop', { clip: await boxOf(media) });
            await page.close();
        },
    );

const colourThemeCheck = (browser) =>
    check('配色: current + three extracted candidates, rotate, apply saves the theme', async () => {
        const state = loggedIn({ realImages: true });
        const page = await newPage(browser, state);
        await page.goto(`${BASE}/dramas/lancy/theme`);
        const group = page.getByRole('group', { name: '配色候選' });
        await group.getByRole('button').nth(3).waitFor();
        await page.getByText('現用：未設定（中性灰）').waitFor();
        await group.getByText('建議').waitFor();
        await shoot(page, 'theme-editor');
        await page.getByRole('button', { name: '更換另外三套' }).click();
        await page.getByText('第 2 / 3 組').waitFor();
        await group.getByRole('button').nth(1).click();
        await page.getByRole('button', { name: '套用' }).click();
        await page.getByText(/已套用「/).waitFor();
        const theme = state.puts.at(-1)?.body.definition.theme;
        if (!theme?.bg || theme.bg === '#141414') throw new Error(`theme not saved: ${theme}`);
        await shoot(page, 'theme-editor-applied');
        await page.close();
    });

const bannerCheck = (browser) =>
    check(
        '首頁 Banner: default, two-step crop, upload both, then restore with confirm',
        async () => {
            const state = loggedIn();
            const page = await newPage(browser, state);
            // 舊網址 /banner 轉去 /appearance（2026-11-13 改名「App 外觀」）
            await page.goto(`${BASE}/banner`);
            await page.waitForURL(`${BASE}/appearance`);
            await page.getByRole('heading', { level: 1, name: 'App 外觀' }).waitFor();
            // 三張卡都係內建預設：淨係睇首頁 Banner 卡嗰個
            const bannerCard = page.locator('.appearance-card', { hasText: '首頁 Banner' });
            await bannerCard.getByText('內建預設').waitFor();
            await shoot(page, 'banner-default');
            const chooser = page.waitForEvent('filechooser');
            await page.getByRole('button', { name: '更換首頁 Banner', exact: true }).click();
            await (
                await chooser
            ).setFiles(fileURLToPath(new URL('./fixtures/lancy-tile.webp', import.meta.url)));
            const first = page.getByRole('dialog', { name: /窄版/ });
            await first.getByText('1 / 2').waitFor();
            await first.locator('.pv .pbanner canvas').waitFor();
            await shoot(page, 'banner-crop-standard');
            await first.getByRole('button', { name: '下一張：闊版' }).click();
            const second = page.getByRole('dialog', { name: /闊版/ });
            await second.getByText('2 / 2').waitFor();
            await second.getByRole('button', { name: '完整 · 模糊背景' }).click();
            await shoot(page, 'banner-crop-long');
            await second.getByRole('button', { name: '上載兩張' }).click();
            await second.waitFor({ state: 'detached' });
            if (state.assets.length !== 2 || !state.banner?.standard || !state.banner?.long)
                throw new Error(`banner not saved: ${JSON.stringify(state.banner)}`);
            await page.getByText('自訂 · 未發佈').waitFor();
            await shoot(page, 'banner-custom');
            await page.getByRole('button', { name: '還原首頁 Banner' }).click();
            const confirm = page.getByRole('dialog', { name: '還原首頁 Banner？' });
            await shoot(page, 'banner-restore-confirm');
            await confirm.getByRole('button', { name: '還原' }).click();
            await bannerCard.getByText('內建預設').waitFor();
            if (state.banner !== null) throw new Error('banner not restored');
            await page.close();
        },
    );

const ICON_FIXTURE = fileURLToPath(new URL('./fixtures/lancy-disc.webp', import.meta.url));

const brandingCheck = (browser) =>
    check(
        'App 外觀: change icon, rename app (confirm), restore, publish deploy note + status',
        async () => {
            const state = loggedIn();
            const page = await newPage(browser, state);
            await page.goto(`${BASE}/appearance`);
            await page.getByRole('heading', { level: 1, name: 'App 外觀' }).waitFor();
            // 三張卡：App 圖示 → 名稱與簡介 → 首頁 Banner
            const headings = await page.getByRole('heading', { level: 2 }).allTextContents();
            if (headings.join('|') !== 'App 圖示|名稱與簡介|首頁 Banner')
                throw new Error(`card order: ${headings.join('|')}`);
            await shoot(page, 'appearance');

            // ① 更換 App 圖示（同一裁切）
            const chooser = page.waitForEvent('filechooser');
            await page.getByRole('button', { name: '更換 App 圖示', exact: true }).click();
            await (await chooser).setFiles(ICON_FIXTURE);
            const dialog = page.getByRole('dialog', { name: '更換 App 圖示' });
            await dialog.getByRole('group', { name: '裝置' }).waitFor();
            await shoot(page, 'appearance-icon-dialog');
            await dialog.getByRole('button', { name: '上載' }).click();
            await dialog.waitFor({ state: 'detached' });
            if (!state.branding.icon || state.assets.length < 5)
                throw new Error(`icon not saved: ${JSON.stringify(state.branding.icon)}`);
            await page.getByText('自訂 · 未發佈').first().waitFor();
            await shoot(page, 'appearance-icon');

            // ② 改 App 名 → 確認
            const name = page.getByLabel('App 名');
            await name.fill('903 叱咤 Player Plus');
            await page.getByRole('button', { name: '儲存名稱與簡介' }).click();
            const rename = page.getByRole('dialog', { name: '更改 App 名？' });
            await rename.getByText('903 叱咤 Player Plus').waitFor();
            await shoot(page, 'appearance-rename');
            await rename.getByRole('button', { name: '儲存' }).click();
            await rename.waitFor({ state: 'detached' });
            if (state.branding.text?.name !== '903 叱咤 Player Plus')
                throw new Error(`text not saved: ${JSON.stringify(state.branding.text)}`);

            // ③ 還原 App 圖示（確認）
            await page.getByRole('button', { name: '還原 App 圖示' }).click();
            const restore = page.getByRole('dialog', { name: '還原 App 圖示？' });
            await restore.getByRole('button', { name: '還原' }).click();
            await restore.waitFor({ state: 'detached' });
            if (state.branding.icon !== null) throw new Error('icon not restored');

            // ④ 發佈頁：App 外觀已更改 + 須重新部署提示
            await page.goto(`${BASE}/publish`);
            await page.getByText('App 外觀已更改').waitFor();
            await page.getByText(/圖示、名稱及簡介須重新部署/).waitFor();
            await shoot(page, 'appearance-publish');
            await page.getByRole('button', { name: '發佈', exact: true }).click();
            await page.getByRole('heading', { name: '發佈 / 部署' }).waitFor();

            // ⑤ 部署狀態：triggered 行 poll → 已部署 + GitHub 連結
            await page.getByText('已部署').waitFor();
            await page
                .getByRole('link', { name: /在 GitHub 查看/ })
                .first()
                .waitFor();
            await shoot(page, 'appearance-deploy');
            await page.close();
        },
    );

const publishWarningsCheck = (browser) =>
    check('publish: 配色 warnings fold into one line, expand with links', async () => {
        const page = await newPage(browser, loggedIn({ warnings: true }));
        await page.goto(`${BASE}/publish`);
        await page.getByText('3 項配色警告（不影響發佈）').waitFor();
        await shoot(page, 'publish-warnings');
        await page.getByRole('button', { name: '展開' }).click();
        const list = page.getByRole('list', { name: '配色警告' });
        await list.getByText('蘭茜夫人劇場：muted 與 surface 對比度 3.9:1（需 ≥ 4.5:1）').waitFor();
        await list.getByRole('link', { name: '前往選擇' }).waitFor();
        if (await page.getByRole('button', { name: '發佈' }).isDisabled())
            throw new Error('warnings must not block 發佈');
        await shoot(page, 'publish-warnings-open');
        await page.close();
    });

const portraitCheck = (browser) =>
    check('portrait phone only shows the rotate notice', async () => {
        const page = await newPage(browser, loggedIn(), PORTRAIT);
        await page.goto(BASE);
        await page.getByRole('heading', { name: '請轉為橫向或使用電腦' }).waitFor();
        if (await page.getByRole('navigation', { name: '主選單' }).isVisible())
            throw new Error('nav visible');
        await shoot(page, 'portrait');
        // 未登入都係：直向提示蓋過 login 頁
        const out = await newPage(browser, createState(), PORTRAIT);
        await out.goto(BASE);
        await out.getByRole('heading', { name: '請轉為橫向或使用電腦' }).waitFor();
        if (await out.getByRole('link', { name: '使用 Google 登入' }).isVisible())
            throw new Error('login visible on a portrait phone');
        await out.close();
        await page.close();
    });

mkdirSync(OUT, { recursive: true });
try {
    await assertPortFree();
    await assertFetchablePort();
} catch (error) {
    console.error(`admin e2e: ${error.message}`);
    process.exit(1);
}
const preview = startPreview();
// Ctrl-C / 被 kill / 任何 process.exit 都要收埋 preview group
process.once('exit', () => killPreviewNow(preview));
for (const [signal, exitCode] of Object.entries(SIGNAL_EXIT_CODES))
    process.once(signal, () => {
        killPreviewNow(preview);
        process.exit(exitCode);
    });
try {
    await waitForServer(preview);
    const browser = await chromium.launch({
        executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    });
    for (const run of [
        loginCheck,
        todoFlowCheck,
        reorderCheck,
        newDramaDialogCheck,
        showListCheck,
        scheduleEditCheck,
        schedulePreviewCheck,
        schedulePreviewListingOnlyCheck,
        scheduleChipCheck,
        scheduleContrastCheck,
        scheduleAllListedCheck,
        scheduleConflictCheck,
        scheduleUnlistPastCheck,
        scheduleDateFieldCheck,
        scheduleDateFieldUpCheck,
        scheduleTodayOverlapCheck,
        presetChipCheck,
        realImagesCheck,
        r2AutoCropCheck,
        colourThemeCheck,
        bannerCheck,
        brandingCheck,
        publishWarningsCheck,
        missingFolderCheck,
        actionIconsCheck,
        showEditorCheck,
        narrowRollerCheck,
        imageCheck,
        unreleasedScheduleCheck,
        toggleHoverCheck,
        savebarCheck,
        todoRowCheck,
        newShowCheck,
        arcLinkCheck,
        arcStatusCheck,
        dramaListStatusCheck,
        arcMemoryCheck,
        arcMemoryBackCheck,
        arcMemoryReloadCheck,
        navCheck,
        reducedMotionCheck,
        autoNavCheck,
        themeCheck,
        portraitCheck,
    ])
        await run(browser);
    await browser.close();
} catch (error) {
    log(false, `admin e2e aborted: ${error instanceof Error ? error.message : error}`);
} finally {
    await stopPreview(preview);
}
console.log(failures === 0 ? 'admin e2e: all passed' : `admin e2e: ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
