// Admin e2e（細 smoke）：vite preview 出 dist，Playwright mock 晒 /api、/auth（唔使 Worker / Google）。
// 用法：npm run e2e -w apps/admin（= build + 呢個檔）；E2E_PORT 改 port；PW_CHROMIUM_PATH 指定 Chromium
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createState, E2E_NOW, E2E_TIMEZONE, installMockApi } from './mockApi.mjs';

const PORT = Number(process.env.E2E_PORT || 4174);
const BASE = `http://localhost:${PORT}`;
const OUT = new URL('./screenshots', import.meta.url).pathname;
const WIDE = { width: 1280, height: 860 };
const PORTRAIT = { width: 390, height: 844 };
const STARTUP_TIMEOUT_MS = 30_000;
const KEY_GAP_MS = 200;

let failures = 0;
const log = (ok, message) => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`);
};

const startPreview = () =>
    spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
        cwd: new URL('..', import.meta.url).pathname,
        stdio: 'ignore',
    });

const waitForServer = async () => {
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    while (Date.now() < deadline) {
        try {
            if ((await fetch(BASE)).ok) return;
        } catch {
            // 未起好
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
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

/** 每個主要畫面淺色 + 深色各一張（深色 = prefers-color-scheme: dark） */
const shoot = async (page, name, options = {}) => {
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
        await page.getByRole('heading', { name: '上下架記錄' }).waitFor();
        await page.getByText('使用中').waitFor();
        await page.getByText('#3', { exact: true }).waitFor();
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

const scheduleConflictCheck = (browser) =>
    check('schedule: an unlist date not after listing pops an error only on 儲存', async () => {
        const page = await newPage(browser, scheduleState());
        await page.goto(SCHEDULE_ALL_LISTED);
        await page.getByRole('button', { name: '指定日全部' }).click();
        await page.getByLabel('下架日期', { exact: true }).fill('01/09/2026');
        await page.getByText('全部下架').waitFor();
        if ((await page.getByRole('alert').count()) > 0) throw new Error('error shown before 儲存');
        await page.getByRole('button', { name: '儲存' }).click();
        const alert = page.getByRole('alert');
        await alert.waitFor();
        const text = await alert.textContent();
        if (
            text !==
            '無法儲存：第 1 集的下架日期（1/9 二）必須遲於其上架日期（27/10 二），請修改下架設定。'
        )
            throw new Error(`alert: ${text}`);
        await shoot(page, 'schedule-conflict', { fullPage: true });
        await page.close();
    });

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
 * 真圖（e2e/fixtures，player 嘅 cover）：「口水多過浪花」同「蘭茜夫人劇場」有 Banner / 碟面，
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
        // 上載預覽 dialog：用真圖揀檔，原圖 / 裁切後都係虛線框（碟面裁切後淨係圓形虛線框）
        await page.goto(`${BASE}/dramas/lancy`);
        for (const [slot, label] of [
            ['disc', '碟面'],
            ['tile', 'Banner'],
        ]) {
            const chooser = page.waitForEvent('filechooser');
            await page.getByRole('button', { name: `更換${label}` }).click();
            await (
                await chooser
            ).setFiles(new URL(`./fixtures/lancy-${slot}.webp`, import.meta.url).pathname);
            const dialog = page.getByRole('dialog', { name: `上載${label}` });
            await dialog.getByRole('figure', { name: '裁切後' }).getByText(/WebP/).waitFor();
            await assertFrames(dialog.locator('.frame').first(), 'dashed', `${slot} source frame`);
            await assertFrames(
                dialog.locator(slot === 'disc' ? '.out.disc' : '.frame').last(),
                'dashed',
                `${slot} result frame`,
            );
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
            const dialog = page.getByRole('dialog', { name: '上載碟面' });
            // 原圖 | 裁切後兩格並排，說明喺各自圖下面
            const source = dialog.getByRole('figure', { name: '原圖' });
            const result = dialog.getByRole('figure', { name: '裁切後' });
            await source.getByText('1×1 · PNG').waitFor();
            await result.getByText(/^600×600 · WebP · 約 \d+ KB$/).waitFor();
            const [left, right] = [await boxOf(source), await boxOf(result)];
            if (Math.abs(left.y - right.y) > 2 || right.x <= left.x + left.width - 1)
                throw new Error('原圖 / 裁切後 are not side by side');
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

const boxOf = async (locator, x = undefined, height = undefined) => {
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
            await shoot(page, 'nav-mini-logo', { clip: await boxOf(page.locator('.nav'), 0, 140) });
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
            await page.getByRole('heading', { name: '上下架記錄' }).waitFor();
            await page.screenshot({ path: `${OUT}/theme-manual-dark.png` });
            await page.getByRole('button', { name: '跟系統' }).click();
            if (await page.evaluate(() => document.documentElement.hasAttribute('data-theme')))
                throw new Error('跟系統 should clear data-theme');
            await page.close();
        },
    );

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
const preview = startPreview();
try {
    await waitForServer();
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
        scheduleChipCheck,
        scheduleContrastCheck,
        scheduleAllListedCheck,
        scheduleConflictCheck,
        scheduleDateFieldCheck,
        scheduleTodayOverlapCheck,
        presetChipCheck,
        realImagesCheck,
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
        navCheck,
        reducedMotionCheck,
        autoNavCheck,
        themeCheck,
        portraitCheck,
    ])
        await run(browser);
    await browser.close();
} finally {
    preview.kill();
}
console.log(failures === 0 ? 'admin e2e: all passed' : `admin e2e: ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
