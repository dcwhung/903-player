// 端對端測試：真 Chromium + vite preview + 假錄音列表 + 模擬 audio server（支援 Range）
// 用法：npm run e2e（截圖輸出去 e2e/screenshots/）
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { silenceWav } from './silenceWav.mjs';

const PORT = Number(process.env.E2E_PORT ?? 4173);
const BASE = `http://localhost:${PORT}/903-player/`;
const OUT = new URL('./screenshots', import.meta.url).pathname;
const AUDIO_SECONDS = 600;
const wav = silenceWav(AUDIO_SECONDS);
mkdirSync(OUT, { recursive: true });

const APP_VERSION_TEXT = `v${JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version}`;

let failures = 0;
const log = (ok, msg) => {
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
};

const startPreview = async () => {
    // 直接用 node 行 vite（唔經 npx），kill 先會停到真正嘅 server
    const viteBin = new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname;
    const server = spawn(
        process.execPath,
        [viteBin, 'preview', '--port', String(PORT), '--strictPort'],
        { stdio: 'ignore' },
    );
    for (let i = 0; i < 30; i += 1) {
        try {
            if ((await fetch(BASE)).ok) return server;
        } catch {
            // server 未起好
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    server.kill();
    throw new Error('vite preview did not start');
};

/** 版本號要見到，而且喺 mini player 上面（捲到底都唔會畀佢遮住） */
const checkVersionClear = async (p, label) => {
    const version = p.getByText(APP_VERSION_TEXT, { exact: true });
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const v = await version.boundingBox();
    const m = await p.getByRole('region', { name: '正在播放（今日節目）' }).boundingBox();
    const ok = (await version.isVisible()) && v !== null && m !== null && v.y + v.height <= m.y;
    log(
        ok,
        `${label}：版本號 ${APP_VERSION_TEXT} 喺 mini player 上面（底 ${v?.y + v?.height} ≤ ${m?.y}）`,
    );
};

const MIN_VISIBLE_ROWS = 2;
const WHEEL_PX = 400;
const SWIPE_FROM_PX = 120;
// 同 tokens.css 嘅 --player-disc-min 同 Page.module.css 嘅成頁捲斷點（max-height）一致
const DISC_MIN_PX = 160;
const SHORT_HEIGHT_PX = 561;
// 今日節目頁同主頁一直用 --space-5 間距
const TODAY_GAP = '20px';
const SHOW_VIEWPORTS = [
    { width: 390, height: 844, swipe: true },
    { width: 320, height: 568, swipe: true },
    // 常見手機（iPhone SE / 細 Android / 有工具列嘅 Safari）
    { width: 390, height: 720 },
    { width: 375, height: 667 },
    { width: 390, height: 664 },
    // 橫向手機 / 矮視窗
    { width: 844, height: 390 },
    { width: 568, height: 320 },
    { width: 1280, height: 400 },
    { width: 390, height: 540 },
    // 成頁捲斷點兩邊：560 成頁捲，562 固定（最細唱片仍然見到兩行）
    { width: 390, height: 560 },
    { width: 390, height: 562 },
];

/** 節目頁固定：捲集數 panel 時 window 唔郁、控制掣仍然喺畫面，panel 自己嘅 scrollTop 有變 */
const checkFixedShowPage = async (p, label, shot) => {
    const panel = p.getByRole('region', { name: '集數' }).getByRole('list');
    const before = await panel.evaluate((el) => el.scrollTop);
    const box = await panel.boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await p.mouse.wheel(0, WHEEL_PX);
    await p.waitForTimeout(600);
    const after = await panel.evaluate((el) => el.scrollTop);
    log(after !== before, `${label}：集數 panel 自己捲（scrollTop ${before} → ${after}）`);
    // 喺唱片上面捲都唔會捲成頁
    const disc = await p.getByRole('slider', { name: '播放進度' }).boundingBox();
    await p.mouse.move(disc.x + disc.width / 2, disc.y + disc.height / 2);
    await p.mouse.wheel(0, WHEEL_PX);
    await p.waitForTimeout(300);
    const page = await p.evaluate(() => ({
        scrollY: window.scrollY,
        overflow: document.documentElement.scrollHeight - window.innerHeight,
    }));
    log(page.scrollY === 0 && page.overflow <= 0, `${label}：成頁唔捲（${JSON.stringify(page)}）`);
    await checkControlsInView(p, label);
    const rows = await visibleRows(panel);
    log(rows >= MIN_VISIBLE_ROWS, `${label}：清單見到約 ${rows.toFixed(2)} 行`);
    await logDiscSize(p, label, rows.toFixed(2));
    await p.screenshot({ path: `${OUT}/${shot}` });
};

/** 清單 panel 見到幾多行：扣走底部 padding（安全區），用第一行嘅真實高度計 */
const visibleRows = (panel) =>
    panel.evaluate((el) => {
        const padding = parseFloat(getComputedStyle(el).paddingBottom);
        const row = el.querySelector('li')?.getBoundingClientRect().height ?? 1;
        return (el.clientHeight - padding) / row;
    });

/** 唱片闊度（同列表行數一齊印出嚟，方便對照） */
const logDiscSize = async (p, label, rows) => {
    const disc = (await p.getByRole('slider', { name: '播放進度' }).boundingBox()).width;
    log(
        disc >= DISC_MIN_PX,
        `${label}：唱片 ${disc.toFixed(0)}px（≥ ${DISC_MIN_PX}），清單 ${rows}`,
    );
};

/** 好矮嘅畫面（橫向手機 / 矮視窗）：唔再固定，成頁正常捲，清單唔係內部捲動，控制掣捲得到 */
const checkScrollingShowPage = async (p, label, shot) => {
    const list = p.getByRole('region', { name: '集數' }).getByRole('list');
    const inner = await list.evaluate((el) => el.scrollHeight - el.clientHeight);
    log(inner <= 1, `${label}：清單唔係內部捲動（多出 ${inner}px）`);
    await logDiscSize(p, label, '全部（成頁捲）');
    const forward = p.getByRole('button', { name: '前進 60 秒' });
    await forward.scrollIntoViewIfNeeded();
    const b = await forward.boundingBox();
    const overflow = await p.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight,
    );
    const inView = b !== null && b.y >= 0 && b.y + b.height <= p.viewportSize().height;
    log(overflow > 0 && inView, `${label}：成頁捲得、控制掣捲得到（可捲 ${overflow}px）`);
    // 最尾一集都要捲得到
    const last = p.getByRole('region', { name: '集數' }).locator('li button').last();
    await last.scrollIntoViewIfNeeded();
    log(await last.isVisible(), `${label}：捲到最尾一集`);
    await p.screenshot({ path: `${OUT}/${shot}` });
};

/** 返回掣、播放掣同前進掣要完整喺畫面入面 */
const checkControlsInView = async (p, label) => {
    const height = p.viewportSize().height;
    for (const name of ['返回主頁', '後退 60 秒', '前進 60 秒']) {
        const b = await p.getByRole('button', { name }).boundingBox();
        const ok = b !== null && b.y >= 0 && b.y + b.height <= height;
        log(ok, `${label}：「${name}」喺畫面內（y ${b?.y?.toFixed(0)}）`);
    }
};

/** 節目頁同今日節目頁嘅唱片要一樣大（矮螢幕一齊縮） */
const checkDiscMatchesToday = async (p, label) => {
    const discWidth = async () =>
        (await p.getByRole('slider', { name: '播放進度' }).boundingBox()).width;
    const show = await discWidth();
    await p.goto(`${BASE}#/today`);
    await p.getByRole('button', { name: '暫停' }).waitFor({ timeout: 5000 });
    const today = await discWidth();
    log(Math.abs(show - today) < 1, `${label}：唱片同今日節目頁一樣大（${show} / ${today}）`);
    // 節目頁矮螢幕收窄嘅間距唔可以漏去今日節目頁
    const gaps = await p.evaluate(() =>
        [document.querySelector('main'), document.querySelector('[class*="panel"]')].map(
            (el) => getComputedStyle(el).rowGap,
        ),
    );
    log(
        gaps.every((g) => g === TODAY_GAP),
        `${label}：今日節目頁間距不變（${gaps.join(' / ')}）`,
    );
};

/** 喺唱片下面嘅日期 / 節目名區向左掃 → 播放中轉去下一行（舊一集） */
const checkSwipeToOlder = async (p) => {
    const rows = p.getByRole('region', { name: '集數' }).locator('li button');
    const labels = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const from = labels.findIndex((l) => l.includes('播放中'));
    const zone = await p.locator('[aria-roledescription="轉集"]').boundingBox();
    const y = zone.y + zone.height / 2;
    await p.mouse.move(zone.x + zone.width / 2 + SWIPE_FROM_PX / 2, y);
    await p.mouse.down();
    await p.mouse.move(zone.x + zone.width / 2 - SWIPE_FROM_PX / 2, y + 4, { steps: 6 });
    await p.mouse.up();
    await p.waitForTimeout(800);
    const now = await p.locator('button[aria-current="true"]').first().getAttribute('aria-label');
    const olderDate = labels[from + 1]?.split('，')[0];
    log(
        now.startsWith(olderDate) && now.includes('播放中'),
        `向左掃轉舊一集：${labels[from]} → ${now}`,
    );
    const playing = await p.evaluate(() => navigator.mediaSession.playbackState);
    log(playing === 'playing', `掃完即刻播：${playing}`);
};

const server = await startPreview();
let browser;
try {
    browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        colorScheme: 'dark',
    });
    // 模擬真實 audio server 嘅 Range 支援（206 Partial Content），seek 先會成功
    const serveAudio = (route) => {
        const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range ?? '');
        const start = range ? Number(range[1]) : 0;
        const end = range && range[2] ? Number(range[2]) : wav.length - 1;
        route.fulfill({
            status: range ? 206 : 200,
            headers: {
                'Content-Type': 'audio/wav',
                'Accept-Ranges': 'bytes',
                'Content-Length': String(end - start + 1),
                ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}),
            },
            body: wav.subarray(start, end + 1),
        });
    };
    await context.route('https://audio.hkfm903.live/**', serveAudio);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(BASE);
    await page.waitForSelector('nav[aria-busy="false"]');
    await page.screenshot({ path: `${OUT}/1-home.png` });
    const tiles = await page
        .locator('nav button')
        .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? e.textContent));
    log(tiles.length === 6 && tiles[5] === '今日節目', `主頁 6 粒掣：${tiles.join(' | ')}`);
    const cols = await page.evaluate(
        () => getComputedStyle(document.querySelector('nav')).gridTemplateColumns.split(' ').length,
    );
    log(cols === 2, `主頁每行 ${cols} 粒`);

    const mini = page.getByRole('region', { name: '正在播放（今日節目）' });
    log(
        (await mini.textContent()).includes('在晴朗的一天出發'),
        `主頁 mini player 顯示今日第一個節目：${await mini.textContent()}`,
    );
    await page.getByRole('button', { name: '公子會', exact: true }).click();
    await page.getByRole('button', { name: '暫停' }).waitFor({ timeout: 5000 });
    log(page.url().endsWith('#/show/gongzi'), `轉到節目頁並自動播放：${page.url()}`);
    const currentEpisode = () =>
        page.locator('button[aria-current="true"]').first().getAttribute('aria-label');
    const current = await currentEpisode();
    log(current.startsWith('播放 17/10'), `揀中最近一集（今日之前）：${current}`);
    const accent = await page.evaluate(() =>
        getComputedStyle(document.querySelector('[data-theme-scope]')).getPropertyValue(
            '--theme-accent',
        ),
    );
    log(accent.trim() === '#d4af5a', `節目頁用公子會色調：${accent}`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/2-show-playing.png` });

    const slider = page.getByRole('slider', { name: '播放進度' });
    const box = await slider.boundingBox();
    const at = (vx, vy) => [box.x + (vx / 300) * box.width, box.y + (vy / 300) * box.height];
    await page.mouse.move(...at(150, 10));
    await page.mouse.down();
    await page.mouse.move(...at(60, 40), { steps: 5 });
    await page.mouse.move(...at(10, 150), { steps: 5 });
    await page.screenshot({ path: `${OUT}/3-show-dragging.png` });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const afterDrag = Number(await slider.getAttribute('aria-valuenow'));
    log(
        Math.abs(afterDrag - 100) <= 3,
        `拖弧形 slider 去左邊 → ${afterDrag}s（預期約 100s / 600s）`,
    );

    await page.getByRole('button', { name: '前進 60 秒' }).click();
    const afterSkip = Number(await slider.getAttribute('aria-valuenow'));
    log(afterSkip >= 158 && afterSkip <= 165, `前進 60 秒 → ${afterSkip}s`);

    await slider.focus();
    await page.keyboard.press('End');
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /^播放 10\/10/ }).click();
    await page.waitForTimeout(800);
    const row17 = await page
        .getByRole('button', { name: /^播放 17\/10/ })
        .getAttribute('aria-label');
    log(row17.endsWith('已收聽'), `聽到尾嘅 17/10 顯示已收聽：${row17}`);
    const sel = await currentEpisode();
    log(sel.startsWith('播放 10/10'), `撳集數轉集：${sel}`);
    const visible = await page.locator('button[aria-current="true"]').first().isVisible();
    log(visible, '揀中集數喺畫面內');
    await page.screenshot({ path: `${OUT}/4-show-date-changed.png` });

    await page.getByRole('button', { name: '前進 30 秒' }).click();
    await page.getByRole('button', { name: '暫停' }).click();
    const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('903player:progress:v1')),
    );
    const entry = Object.entries(saved).find(([u]) => u.includes('20261010'));
    log(entry && entry[1].position >= 29, `暫停時存低進度：${entry?.[1].position.toFixed(1)}s`);

    await page.getByRole('button', { name: '返回主頁' }).click();
    log(page.url().endsWith('#/'), '返回主頁');
    await page.getByRole('button', { name: '公子會', exact: true }).click();
    await page.waitForTimeout(800);
    const resumed = await currentEpisode();
    log(
        resumed.startsWith('播放 17/10'),
        `再入節目頁：揀返最近一集 ${resumed}（17/10 已聽過 → 由頭播）`,
    );
    const restartPos = Number(await slider.getAttribute('aria-valuenow'));
    log(restartPos <= 3, `已聽過嘅集由頭播：${restartPos}s`);
    const watched17 = () =>
        page.evaluate(
            () =>
                Object.entries(JSON.parse(localStorage.getItem('903player:progress:v1'))).find(
                    ([u]) => u.includes('20261017'),
                )[1].watched,
        );
    log(await watched17(), '重播頭幾秒仍然保留已收聽');
    // 真正播超過 REPLAY_RESET_SECONDS（10 秒）先清走已收聽
    await page.waitForTimeout(11000);
    log(!(await watched17()), '重播超過 10 秒清走已收聽');
    await page.getByRole('button', { name: /^播放 10\/10/ }).click();
    await page.waitForTimeout(800);
    const replayed = await page
        .getByRole('button', { name: /^播放 17\/10/ })
        .getAttribute('aria-label');
    log(/聽到 0:1\d$/.test(replayed), `重播超過 10 秒後清單顯示聽到：${replayed}`);
    const resumePos = Number(await slider.getAttribute('aria-valuenow'));
    log(resumePos >= 29, `未聽完嘅 10/10 續播：${resumePos}s`);

    await page.getByRole('button', { name: '返回主頁' }).click();
    await page.waitForTimeout(300);
    const oldEpisodeState = await page.evaluate(() => navigator.mediaSession.playbackState);
    log(oldEpisodeState === 'paused', `播緊舊集返主頁會暫停：${oldEpisodeState}`);
    await page.getByRole('button', { name: '今日節目', exact: true }).click();
    await page.getByRole('button', { name: '暫停' }).waitFor({ timeout: 5000 });
    await page.waitForTimeout(1000);
    const items = await page
        .getByRole('region', { name: '今日節目' })
        .locator('li button')
        .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    log(items.length === 3, `今日節目列表：${items.join(' | ')}`);
    const heading = await page.getByRole('heading', { level: 1 }).textContent();
    log(heading === '在晴朗的一天出發', `今日自動播第一個節目：${heading}`);
    await page.screenshot({ path: `${OUT}/5-today.png` });
    const carousel = page.getByRole('group', { name: '今日節目，左右掃動轉節目' });
    const box2 = await carousel.boundingBox();
    await page.mouse.move(box2.x + box2.width - 20, box2.y + 40);
    await page.mouse.down();
    await page.mouse.move(box2.x + 40, box2.y + 46, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    const swiped = await page.getByRole('heading', { level: 1 }).textContent();
    log(swiped === 'Bad Girl大過佬', `今日節目向左掃轉下一個節目：${swiped}`);
    await page.getByRole('button', { name: /播放 雲妮鍾情/ }).click();
    await page.waitForTimeout(500);
    log(
        (await page.getByRole('heading', { level: 1 }).textContent()) === '雲妮鍾情',
        '撳節目掣轉播',
    );
    await page.screenshot({ path: `${OUT}/6-today-switched.png` });

    await page.goBack();
    await page.waitForTimeout(500);
    const backState = await page.evaluate(() => navigator.mediaSession.playbackState);
    const miniText = await page.getByRole('region', { name: '正在播放（今日節目）' }).textContent();
    log(
        page.url().endsWith('#/') && backState === 'playing' && miniText.includes('雲妮鍾情'),
        `播緊今日節目用返回手勢返主頁會繼續播，mini player 顯示：${backState} / ${miniText}`,
    );
    await checkVersionClear(page, '390×844');
    await page.screenshot({ path: `${OUT}/7-home-mini-player.png` });

    const narrow = await browser.newContext({ viewport: { width: 320, height: 640 } });
    await narrow.route('https://audio.hkfm903.live/**', serveAudio);
    const np = await narrow.newPage();
    await np.goto(BASE);
    await np.waitForSelector('nav[aria-busy="false"]');
    await checkVersionClear(np, '320×640');
    await np.screenshot({ path: `${OUT}/8-home-version-320.png` });
    for (const route of ['#/show/gongzi', '#/today']) {
        await np.goto(`${BASE}${route}`);
        await np.getByRole('button', { name: '前進 60 秒' }).waitFor();
        const overflow = await np.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        log(overflow === 0, `320px 闊冇橫向捲動（${route}，超出 ${overflow}px）`);
    }
    await narrow.close();

    // 節目頁：夠高就固定、集數清單自己捲；好矮（橫向手機）就成頁正常捲。badgirl 集數多過一個畫面
    for (const { width, height, swipe } of SHOW_VIEWPORTS) {
        const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
        await ctx.route('https://audio.hkfm903.live/**', serveAudio);
        const fp = await ctx.newPage();
        fp.on('pageerror', (e) => errors.push(e.message));
        await fp.goto(`${BASE}#/show/badgirl`);
        await fp.getByRole('button', { name: '暫停' }).waitFor({ timeout: 5000 });
        await fp.waitForTimeout(800);
        const label = `${width}×${height} 節目頁`;
        const shot = `show-${width}x${height}.png`;
        if (swipe) await checkSwipeToOlder(fp);
        if (height > SHORT_HEIGHT_PX) await checkFixedShowPage(fp, label, shot);
        else await checkScrollingShowPage(fp, label, shot);
        await checkDiscMatchesToday(fp, label);
        await ctx.close();
    }

    const light = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        colorScheme: 'light',
    });
    const lp = await light.newPage();
    await lp.goto(BASE);
    await lp.waitForSelector('nav[aria-busy="false"]');
    await lp.screenshot({ path: `${OUT}/7-home-light.png` });

    log(errors.length === 0, `冇 JS error ${errors.join('; ')}`);
} finally {
    await browser?.close();
    server.kill();
}
console.log(failures === 0 ? '\nAll E2E checks passed' : `\n${failures} E2E check(s) failed`);
process.exitCode = failures === 0 ? 0 : 1;
