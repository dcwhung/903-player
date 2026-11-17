// 「現有裝置零改變」截圖比對（P10 lane 0）：將 base（預設同 origin/main 嘅 merge-base）同而家嘅 working tree
// 各 build 一次（--mode e2e），用同一個 Chromium、固定時鐘，喺凍結嘅現有 viewport（visualModel.mjs）× 每個情境
// （visualScenes.mjs）各影一張，逐 pixel 比，另外比元素位置（截圖影唔到捲出畫面嘅內容）。有任何唔同 exit 1。
// 用法（喺 apps/player）：npm run e2e:visual [-- --base <ref>] [--scene a,b] [--viewport 390x844] [--keep-worktree]
//   VISUAL_BASE=HEAD：自己比自己，驗工具本身穩定；VISUAL_PORT：base 用呢個 port、head 用下一個（預設 4183 / 4184）
// 輸出：e2e/screenshots/visual/{base,head,diff}/<情境>@<viewport>.png
import { execFileSync, spawnSync } from 'node:child_process';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readlinkSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { chromiumExecutablePath } from '../scripts/chromiumLaunch.mjs';
import { SHOT, newE2EContext } from './harness.mjs';
import { previewUrl, startPreview } from './previewServer.mjs';
import {
    VERSION_PLACEHOLDER,
    VERSION_TEXT,
    VISUAL_VIEWPORTS,
    diffGeometry,
    parseVisualArgs,
    selectShots,
    summarize,
} from './visualModel.mjs';
import { VISUAL_SCENES } from './visualScenes.mjs';

const APP_DIR = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = fileURLToPath(new URL('./screenshots/visual', import.meta.url));
const DEFAULT_PORT = 4183;
const DEFAULT_BASE_BRANCH = 'origin/main';
const WORKSPACE_SCOPE = '@903-player';
/** 同時影幾多張：每張一個 context；多咗 CPU 爭用，settle 等耐咗反而慢 */
const CONCURRENCY = 4;
/** 影之前等版面定落嚟（捲去當前項、過場）幾耐 */
const SETTLE_MS = 600;
/** 等字型、圖、有限動畫最多幾耐 */
const SETTLE_TIMEOUT_MS = 8000;
/**
 * 令 Chromium 每次畫出嚟逐 pixel 一樣：預設多條 raster thread + GPU raster，縮圖（碟面、卡片圖）同圓角邊
 * 嘅結果會跟 thread 時機浮動（同一個 build 影兩次都有幾十至千幾粒 pixel 唔同）。用單一 thread 嘅軟件 raster、
 * 唔做 partial raster 就穩定（VISUAL_BASE=HEAD 自己比自己全部一樣）
 */
const DETERMINISTIC_RASTER_ARGS = [
    '--disable-gpu',
    '--num-raster-threads=1',
    '--disable-partial-raster',
];
/** 連續兩張截圖之間隔幾耐、最多再影幾多張 */
const STABLE_GAP_MS = 250;
const STABLE_ATTEMPTS = 8;
/** 唔同嘅話重影幾多次先當真（排除偶發嘅時間差） */
const RETRIES = 1;

const git = (args, cwd = APP_DIR) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

const run = (command, args, cwd) => {
    const { status } = spawnSync(command, args, { cwd, stdio: ['ignore', 'ignore', 'inherit'] });
    if (status !== 0) throw new Error(`${command} ${args.join(' ')} 失敗（${cwd}）`);
};

/**
 * base worktree 嘅 node_modules：逐個 symlink 去而家 repo 嘅（唔使再 npm ci），
 * 但 workspace package（@903-player/*）要指返 worktree 自己嘅 source，否則 base 會用咗 head 嘅 catalog
 */
const linkNodeModules = (repoRoot, worktree) => {
    const source = join(repoRoot, 'node_modules');
    const target = join(worktree, 'node_modules');
    mkdirSync(target);
    for (const name of readdirSync(source)) {
        if (name === WORKSPACE_SCOPE) continue;
        symlinkSync(join(source, name), join(target, name));
    }
    const scope = join(source, WORKSPACE_SCOPE);
    mkdirSync(join(target, WORKSPACE_SCOPE));
    for (const name of readdirSync(scope)) {
        const packageDir = relative(repoRoot, resolve(scope, readlinkSync(join(scope, name))));
        symlinkSync(join(worktree, packageDir), join(target, WORKSPACE_SCOPE, name));
    }
};

const viteBuild = (appDir) => {
    const viteBin = fileURLToPath(new URL('bin/vite.js', import.meta.resolve('vite/package.json')));
    run(process.execPath, [viteBin, 'build', '--mode', 'e2e'], appDir);
};

/** 喺暫存 folder 開 base 嘅 worktree 並 build；回傳 worktree 同入面 app folder 嘅位置 */
const buildBase = (repoRoot, sha) => {
    const worktree = join(mkdtempSync(join(tmpdir(), '903-visual-')), 'base');
    git(['worktree', 'add', '--detach', worktree, sha], repoRoot);
    try {
        linkNodeModules(repoRoot, worktree);
        const appDir = join(worktree, relative(repoRoot, APP_DIR));
        viteBuild(appDir);
        return { worktree, appDir };
    } catch (error) {
        removeWorktree(repoRoot, worktree);
        throw error;
    }
};

const removeWorktree = (repoRoot, worktree) => {
    try {
        git(['worktree', 'remove', '--force', worktree], repoRoot);
    } catch {
        // worktree 已經唔喺度
    }
    rmSync(dirname(worktree), { recursive: true, force: true });
};

/** 喺頁面入面行：等字型、圖、有限動畫行完，再等兩格（超時就照影，交畀比對去報） */
const settleInPage = async (timeoutMs) => {
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const images = [...document.images]
        .filter((img) => !img.complete && img.loading !== 'lazy')
        .map((img) => new Promise((r) => img.addEventListener('loadend', r, { once: true })));
    const finite = document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined));
    const settled = Promise.all([document.fonts.ready, ...images, ...finite]);
    await Promise.race([settled, new Promise((r) => setTimeout(r, timeoutMs))]);
    await frame();
    await frame();
};

/** 喺頁面入面行：版本號換做固定字（同 visualModel.mjs normalizeVersionText 一樣；pattern 由 node 傳入，唔手抄） */
const normalizeVersionInPage = ({ source, flags, placeholder }) => {
    const pattern = new RegExp(source, flags);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const next = node.nodeValue.replace(pattern, placeholder);
        if (next !== node.nodeValue) node.nodeValue = next;
    }
};
const VERSION_ARGS = {
    source: VERSION_TEXT.source,
    flags: VERSION_TEXT.flags,
    placeholder: VERSION_PLACEHOLDER,
};

/**
 * 喺頁面入面行：有內容嘅元素（圖、掣、連結、輸入、自己有字）嘅位置，文件次序。
 * 唔計純包裝用嘅 div：加一層 wrapper 唔算版面改咗。key 用 tag + 字（CSS module class 名每個 build 唔同，用唔得）
 */
const collectGeometry = () => {
    const CONTENT_TAGS = new Set(['IMG', 'SVG', 'BUTTON', 'A', 'INPUT', 'CANVAS', 'VIDEO']);
    const KEY_TEXT_LENGTH = 24;
    const round = (value) => Math.round(value * 100) / 100;
    const ownText = (el) =>
        [...el.childNodes]
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.nodeValue.trim())
            .join('');
    const items = [];
    for (const el of document.body.querySelectorAll('*')) {
        const text = ownText(el);
        if (!CONTENT_TAGS.has(el.tagName.toUpperCase()) && text === '') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        items.push({
            key: `${el.tagName.toLowerCase()}|${text.slice(0, KEY_TEXT_LENGTH)}`,
            x: round(rect.x),
            y: round(rect.y),
            width: round(rect.width),
            height: round(rect.height),
        });
    }
    return items;
};

/**
 * 連續兩張一樣先收貨（同 Playwright toHaveScreenshot 做法一樣）：轉 tab / 轉頁之後 Chromium 會先用
 * 低質素縮圖、遲啲先重畫，啱啱定落嚟就影會有幾粒 pixel 浮動。影到上限都唔定就交最後一張，由比對去報
 */
const stableScreenshot = async (p) => {
    let previous = await p.screenshot({ ...SHOT, caret: 'hide' });
    for (let attempt = 0; attempt < STABLE_ATTEMPTS; attempt += 1) {
        await p.waitForTimeout(STABLE_GAP_MS);
        const next = await p.screenshot({ ...SHOT, caret: 'hide' });
        if (next.equals(previous)) return next;
        previous = next;
    }
    return previous;
};

/** 影一張：開 context → 行情境 → 等定 → 截圖 + 位置 */
const capture = async (browser, base, { scene, viewport }, file) => {
    const ctx = await newE2EContext(
        browser,
        {
            viewport: { width: viewport.width, height: viewport.height },
            hasTouch: viewport.touch,
            colorScheme: 'dark',
            deviceScaleFactor: 1,
            // 減少動態：app 直接切換、唔播過場，碟唔自轉。過場行到一半或者啱啱行完嘅 layer，
            // Chromium 嘅 raster 每次有幾粒 pixel 唔同（tab 滑塊邊、卡片圓角）；暫停嘅碟停喺隨機角度。
            // 靜止版面同正常動態一樣，比對嘅係版面
            reducedMotion: 'reduce',
        },
        scene.now ? { now: scene.now } : {},
    );
    try {
        await scene.seed?.(ctx);
        const p = await ctx.newPage();
        await scene.run(p, base);
        await p.waitForTimeout(SETTLE_MS);
        await p.evaluate(settleInPage, SETTLE_TIMEOUT_MS);
        await p.evaluate(normalizeVersionInPage, VERSION_ARGS);
        const geometry = await p.evaluate(collectGeometry);
        const png = await stableScreenshot(p);
        writeFileSync(file, png);
        return { png, geometry };
    } finally {
        await ctx.close();
    }
};

/** 喺頁面入面行：兩張 PNG 逐 pixel 比；回傳唔同嘅 pixel 數同標紅咗嘅 diff 圖（尺寸唔同就成張當唔同） */
const comparePngInPage = async ([baseUrl, headUrl]) => {
    const load = async (url) => {
        const img = new Image();
        img.src = url;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(img, 0, 0);
        return { canvas, context };
    };
    const [base, head] = await Promise.all([load(baseUrl), load(headUrl)]);
    const { width, height } = head.canvas;
    if (base.canvas.width !== width || base.canvas.height !== height) {
        return {
            pixels: Math.max(width * height, base.canvas.width * base.canvas.height),
            diff: null,
        };
    }
    const before = base.context.getImageData(0, 0, width, height).data;
    const after = head.context.getImageData(0, 0, width, height);
    const BYTES_PER_PIXEL = 4;
    let pixels = 0;
    for (let i = 0; i < before.length; i += BYTES_PER_PIXEL) {
        const same =
            before[i] === after.data[i] &&
            before[i + 1] === after.data[i + 1] &&
            before[i + 2] === after.data[i + 2] &&
            before[i + 3] === after.data[i + 3];
        if (same) continue;
        pixels += 1;
        after.data.set([255, 0, 0, 255], i);
    }
    head.context.putImageData(after, 0, 0);
    return { pixels, diff: head.canvas.toDataURL('image/png') };
};

const DATA_URL_PREFIX = 'data:image/png;base64,';
const toDataUrl = (png) => `${DATA_URL_PREFIX}${png.toString('base64')}`;

/** byte 一樣就唔使 decode；唔同先入瀏覽器數 pixel（PNG 壓縮唔同但畫面一樣會係 0） */
const comparePng = async (comparer, base, head, diffFile) => {
    // 重影嗰次先一樣：上一次留低嘅 diff 圖唔好留
    rmSync(diffFile, { force: true });
    if (base.equals(head)) return 0;
    const { pixels, diff } = await comparer.evaluate(comparePngInPage, [
        toDataUrl(base),
        toDataUrl(head),
    ]);
    if (pixels > 0 && diff) {
        writeFileSync(diffFile, Buffer.from(diff.slice(DATA_URL_PREFIX.length), 'base64'));
    }
    return pixels;
};

const describeItem = (item) =>
    item ? `${item.key} @ ${item.x},${item.y} ${item.width}×${item.height}` : '（冇）';

/** 影 base 同 head 各一張再比；唔同就重影（最多 RETRIES 次），仲係唔同先報 */
const compareShot = async (env, shot) => {
    const file = (side) => join(OUT_DIR, side, `${shot.name}.png`);
    let result;
    for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
        const [base, head] = await Promise.all([
            capture(env.browser, env.baseUrl, shot, file('base')),
            capture(env.browser, env.headUrl, shot, file('head')),
        ]);
        const pixels = await comparePng(env.comparer, base.png, head.png, file('diff'));
        result = { name: shot.name, pixels, geometry: diffGeometry(base.geometry, head.geometry) };
        if (pixels === 0 && result.geometry.length === 0) break;
    }
    return result;
};

/** 影唔到（情境 throw）都當唔同，唔好令成個 run 中止 */
const compareShotSafely = async (env, shot) => {
    try {
        return await compareShot(env, shot);
    } catch (error) {
        const reason = String(error instanceof Error ? error.message : error).split('\n')[0];
        console.log(`ERROR ${shot.name}：${reason}`);
        return { name: shot.name, pixels: Number.POSITIVE_INFINITY, geometry: [] };
    }
};

const compareAll = async (env, shots) => {
    const queue = [...shots];
    const results = [];
    const worker = async () => {
        for (let shot = queue.shift(); shot; shot = queue.shift()) {
            const result = await compareShotSafely(env, shot);
            results.push(result);
            for (const { base, head } of result.geometry) {
                console.log(`      ${result.name}：${describeItem(base)} → ${describeItem(head)}`);
            }
        }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    const order = new Map(shots.map((shot, index) => [shot.name, index]));
    return results.sort((a, b) => order.get(a.name) - order.get(b.name));
};

const main = async () => {
    const args = parseVisualArgs(process.argv.slice(2), process.env);
    const shots = selectShots(VISUAL_SCENES, VISUAL_VIEWPORTS, args);
    const repoRoot = git(['rev-parse', '--show-toplevel']);
    const baseSha = git([
        'rev-parse',
        args.base ?? git(['merge-base', 'HEAD', DEFAULT_BASE_BRANCH]),
    ]);
    const port = Number(process.env.VISUAL_PORT || DEFAULT_PORT);
    console.log(
        `base ${baseSha.slice(0, 7)} ↔ working tree（${git(['rev-parse', '--short', 'HEAD'])}）`,
    );
    if (git(['diff', '--name-only', baseSha, '--', 'package-lock.json'], repoRoot) !== '') {
        console.log('WARN  package-lock.json 同 base 唔同：base 用緊而家嘅 node_modules build');
    }

    rmSync(OUT_DIR, { recursive: true, force: true });
    for (const side of ['base', 'head', 'diff'])
        mkdirSync(join(OUT_DIR, side), { recursive: true });

    console.log('build base…');
    const base = buildBase(repoRoot, baseSha);
    const servers = [];
    let browser;
    try {
        console.log('build head…');
        viteBuild(APP_DIR);
        if (!existsSync(join(base.appDir, 'dist')) || !existsSync(join(APP_DIR, 'dist'))) {
            throw new Error('build 冇出 dist');
        }
        servers.push(await startPreview({ port, cwd: base.appDir }));
        servers.push(await startPreview({ port: port + 1, cwd: APP_DIR }));
        browser = await chromium.launch({
            executablePath: chromiumExecutablePath(),
            args: ['--autoplay-policy=no-user-gesture-required', ...DETERMINISTIC_RASTER_ARGS],
        });
        const comparer = await browser.newPage();
        console.log(`影 ${shots.length} 張 × 2…`);
        const results = await compareAll(
            { browser, comparer, baseUrl: previewUrl(port), headUrl: previewUrl(port + 1) },
            shots,
        );
        const summary = summarize(results);
        for (const line of summary.lines) console.log(line);
        if (!summary.ok) console.log(`截圖喺 ${relative(process.cwd(), OUT_DIR)}/{base,head,diff}`);
        process.exitCode = summary.ok ? 0 : 1;
    } finally {
        await browser?.close();
        for (const server of servers) server.kill();
        if (args.keepWorktree) console.log(`base worktree 留喺 ${base.worktree}`);
        else removeWorktree(repoRoot, base.worktree);
    }
};

await main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
