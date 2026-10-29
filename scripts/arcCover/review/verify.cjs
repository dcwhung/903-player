// 本機檢查 review 頁：逐套劇、逐個封面、碟面 / tile 都撳一次，睇 console error、爛圖、橫向 scroll。
// 用法：先 `python serve.py <site>`，再 `node verify.cjs [http://127.0.0.1:8765] [截圖資料夾]`；有問題 exit 1。
const path = require('node:path');

function loadPlaywright() {
    try {
        return require('playwright');
    } catch {
        // agent worktree 冇自己嘅 node_modules：試主 repo（PLAYWRIGHT_PATH 可以覆蓋）
        return require(
            process.env.PLAYWRIGHT_PATH ||
                path.resolve(__dirname, '../../../node_modules/playwright'),
        );
    }
}

const BASE = process.argv[2] || 'http://127.0.0.1:8765';
const SHOTS = process.argv[3];
const VIEWPORTS = [
    [390, 844, 'phone'],
    [1280, 800, 'desktop'],
];

function watch(page, tag, problems) {
    page.on('console', (m) => m.type() === 'error' && problems.push(`${tag} console: ${m.text()}`));
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    page.on('requestfailed', (r) => problems.push(`${tag} reqfail: ${r.url()}`));
    page.on(
        'response',
        (r) => r.status() >= 400 && problems.push(`${tag} ${r.status()} ${r.url()}`),
    );
}

async function checkKind(page, where, kind, problems) {
    await page.click(`.tab[data-kind="${kind}"]`);
    const panel = `.panel[data-kind="${kind}"]`;
    const imgs = page.locator(`${panel} img`);
    for (let i = 0; i < (await imgs.count()); i++) await imgs.nth(i).scrollIntoViewIfNeeded();
    await page.waitForFunction(
        (p) => [...document.querySelectorAll(`${p} img`)].every((i) => i.complete),
        panel,
    );
    const bad = await page.$$eval(`${panel} img`, (a) =>
        a.filter((i) => !i.naturalWidth).map((i) => i.src),
    );
    if (bad.length) problems.push(`${where}/${kind} 爛圖: ${bad}`);
    const first = await page.$eval(`${panel} .opt input`, (i) => i.value);
    if (first !== 'keep') problems.push(`${where}/${kind} 第一個選項係 ${first}（應該係 keep）`);
    const [scroll, inner] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        window.innerWidth,
    ]);
    if (scroll > inner) problems.push(`${where}/${kind} 橫向 scroll ${scroll} > ${inner}`);
}

async function checkViewport(browser, [width, height, tag], expected, problems) {
    const page = await browser.newPage({ viewport: { width, height } });
    watch(page, tag, problems);
    await page.goto(`${BASE}/index.html`);
    await page.waitForSelector('form.pick');
    const dramas = await page.$$eval('#drama option', (o) => o.map((x) => x.value));
    if (dramas.join() !== expected.join())
        problems.push(`${tag} 劇集 ${dramas} ≠ rounds.json ${expected}`);
    for (const drama of dramas) {
        await page.selectOption('#drama', drama);
        const slugs = await page.$$eval('.chip', (c) => c.map((x) => x.dataset.arc));
        for (const slug of slugs) {
            await page.click(`.chip[data-arc="${slug}"]`);
            await page.waitForSelector(`form.pick[data-arc="${slug}"]`);
            for (const kind of ['disc', 'tile'])
                await checkKind(page, `${tag} ${drama}/${slug}`, kind, problems);
        }
        if (SHOTS)
            await page.screenshot({
                path: path.join(SHOTS, `${tag}-${drama}.png`),
                fullPage: true,
            });
        console.log(tag, drama, `${slugs.length} 個封面`);
    }
    await page.close();
}

(async () => {
    const { chromium } = loadPlaywright();
    const rounds = await (await fetch(`${BASE}/rounds.json`)).json();
    const expected = rounds.dramas.map((d) => d.id);
    const browser = await chromium.launch();
    const problems = [];
    for (const viewport of VIEWPORTS) await checkViewport(browser, viewport, expected, problems);
    await browser.close();
    console.log(
        problems.length
            ? `PROBLEMS\n${problems.join('\n')}`
            : `OK：${expected.length} 套劇，冇問題`,
    );
    process.exit(problems.length ? 1 : 0);
})();
