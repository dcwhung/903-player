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
        await page.screenshot({ path: `${OUT}/login.png` });
        await page.close();
    });

const todoFlowCheck = (browser) =>
    check('auto scan → matrix → set ID → back → publish → history', async () => {
        const state = { ...createState(), loggedIn: true };
        const page = await newPage(browser, state);
        await page.goto(BASE);
        await page.getByText('已掃描 R2').waitFor();
        await page.getByRole('link', { name: '我心不死：ID' }).click();
        await page.getByRole('region', { name: '處理待辦' }).getByText('尚欠：ID').waitFor();
        const id = page.getByRole('textbox', { name: /短篇 ID/ });
        await id.fill('heart');
        await id.press('Enter');
        await page.screenshot({ path: `${OUT}/arc-editor.png` });
        await page.getByRole('button', { name: '儲存並返回待辦' }).click();
        await page.getByRole('button', { name: '下一步：確認發佈 →' }).click();
        await page.getByText('即時上線').waitFor();
        await page.screenshot({ path: `${OUT}/publish.png` });
        await page.getByRole('button', { name: '發佈', exact: true }).click();
        await page.getByRole('heading', { name: '上下架記錄' }).waitFor();
        await page.getByText('#1', { exact: true }).waitFor();
        await page.screenshot({ path: `${OUT}/history.png` });
        if (state.puts[0]?.body.definition.arcs[1].id !== 'heart')
            throw new Error('arc ID not saved');
        await page.close();
    });

const reorderCheck = (browser) =>
    check('keyboard drag reorder saves on drop', async () => {
        const state = { ...createState(), loggedIn: true };
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
        await page.screenshot({ path: `${OUT}/dramas.png` });
        await page.close();
    });

const portraitCheck = (browser) =>
    check('portrait phone only shows the rotate notice', async () => {
        const page = await newPage(browser, { ...createState(), loggedIn: true }, PORTRAIT);
        await page.goto(BASE);
        await page.getByRole('heading', { name: '請轉為橫向或使用電腦' }).waitFor();
        if (await page.getByRole('navigation', { name: '主選單' }).isVisible())
            throw new Error('nav visible');
        await page.screenshot({ path: `${OUT}/portrait.png` });
        await page.close();
    });

mkdirSync(OUT, { recursive: true });
const preview = startPreview();
try {
    await waitForServer();
    const browser = await chromium.launch({
        executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    });
    for (const run of [loginCheck, todoFlowCheck, reorderCheck, portraitCheck]) await run(browser);
    await browser.close();
} finally {
    preview.kill();
}
console.log(failures === 0 ? 'admin e2e: all passed' : `admin e2e: ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
