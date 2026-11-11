// Admin e2e（細 smoke）：vite preview 出 dist，Playwright mock 晒 /api、/auth（唔使 Worker / Google）。
// 用法：npm run e2e -w apps/admin（= build + 呢個檔）；E2E_PORT 改 port；PW_CHROMIUM_PATH 指定 Chromium
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createState, installMockApi } from './mockApi.mjs';

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

const newPage = async (browser, state, viewport = WIDE) => {
    const page = await browser.newPage({ viewport });
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

const loggedIn = () => ({ ...createState(), loggedIn: true });

const check = async (name, fn) => {
    try {
        await fn();
        log(true, name);
    } catch (error) {
        log(false, `${name}: ${error instanceof Error ? error.message : error}`);
    }
};

const loginCheck = (browser) =>
    check('login screen when /api/me is 401', async () => {
        const page = await newPage(browser, createState());
        await page.goto(BASE);
        const google = page.getByRole('link', { name: '使用 Google 登入' });
        await google.waitFor();
        if ((await google.getAttribute('href')) !== '/auth/google/start')
            throw new Error('bad href');
        await shoot(page, 'login');
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

const scheduleCheck = (browser) =>
    check('schedule tab previews future batches after 今天', async () => {
        const page = await newPage(browser, loggedIn());
        await page.goto(`${BASE}/dramas/lancy/schedule#lancy-02`);
        await page.getByRole('button', { name: '逢一三五 · 每次 5 集' }).click();
        const future = page.getByRole('group', { name: '今天之後的批次' });
        await future.locator('.seg-batch').first().waitFor();
        if (await page.getByText(/無法預覽/).isVisible()) throw new Error('preview failed');
        await shoot(page, 'schedule', { fullPage: true });
        await page.close();
    });

const showEditorCheck = (browser) =>
    check('show editor: 設定播放時間 checkbox reveals the roller', async () => {
        const page = await newPage(browser, loggedIn());
        await page.goto(`${BASE}/shows/night`);
        await page.getByRole('switch', { name: '狀態' }).waitFor();
        if (await page.getByRole('button', { name: /開始時間/ }).isVisible())
            throw new Error('time boxes shown without 設定播放時間');
        await page.getByRole('checkbox', { name: '設定播放時間' }).check();
        await page.getByRole('button', { name: /開始時間/ }).click();
        await shoot(page, 'show-editor', { fullPage: true });
        await page.close();
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
            const chooser = page.waitForEvent('filechooser');
            await page.getByRole('button', { name: '上載碟面' }).click();
            await (
                await chooser
            ).setFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG_1PX });
            const dialog = page.getByRole('dialog', { name: '上載碟面' });
            await dialog.getByText('photo.png · 1×1 → 600×600 WebP（置中裁切）').waitFor();
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

const boxOf = async (locator) => {
    const box = await locator.boundingBox();
    if (!box) throw new Error('element not visible');
    return box;
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
            await shoot(page, 'nav-mini');
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
        showListCheck,
        scheduleCheck,
        showEditorCheck,
        imageCheck,
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
