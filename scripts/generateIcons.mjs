// 由 design/app-icon.png 重新生成 public/ 入面嘅 PWA icon：node scripts/generateIcons.mjs
// 用 Playwright（devDependency，e2e 已經用緊）嘅 Chromium 縮放同截圖，唔使另外裝圖片工具。
// 有 ImageMagick（magick / convert）就順手做無損壓縮（去 metadata、最高 zlib 壓縮），冇就跳過。
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SOURCE = fileURLToPath(new URL('../design/app-icon.png', import.meta.url));
const OUT_DIR = fileURLToPath(new URL('../public/', import.meta.url));
// icon 嘅柔藍底色（要同 app-icon.png 背景一致）：maskable 同 apple-touch-icon 用嚟填滿四角
const ICON_BACKGROUND = '#98bdde';

/**
 * fill：底色（冇就透明）；scale：圖佔邊長幾多。
 * maskable 要將內容收喺中間 80% 安全區；apple-touch-icon 唔支援透明（iOS 會填黑），
 * 所以填底色再放大少少蓋走原圖圓角外嘅透明位。
 */
const ICONS = [
    { name: 'icon-192.png', size: 192, scale: 1 },
    { name: 'icon-512.png', size: 512, scale: 1 },
    { name: 'icon-maskable-512.png', size: 512, scale: 0.8, fill: ICON_BACKGROUND },
    { name: 'apple-touch-icon.png', size: 180, scale: 1.02, fill: ICON_BACKGROUND },
    { name: 'favicon.png', size: 64, scale: 1 },
];

const iconHtml = (dataUrl, { size, scale, fill }) => {
    const inner = Math.round(size * scale);
    const body = [
        'margin:0',
        `width:${size}px`,
        `height:${size}px`,
        'display:flex',
        'align-items:center',
        'justify-content:center',
        `background:${fill ?? 'transparent'}`,
    ].join(';');
    const img = `width:${inner}px;height:${inner}px;object-fit:contain`;
    return `<html><body style="${body}"><img src="${dataUrl}" style="${img}"></body></html>`;
};

/** 搵到 ImageMagick 就返回指令名（v7 magick / v6 convert），冇就 null */
const findImageMagick = () => {
    for (const command of ['magick', 'convert']) {
        try {
            execFileSync(command, ['-version'], { stdio: 'ignore' });
            return command;
        } catch {
            // 試下一個
        }
    }
    return null;
};

/** 無損：只去 metadata 同用最高壓縮，像素唔變 */
const optimise = (command, path) =>
    execFileSync(command, [
        path,
        '-strip',
        '-define',
        'png:compression-level=9',
        '-define',
        'png:compression-strategy=1',
        path,
    ]);

const dataUrl = `data:image/png;base64,${readFileSync(SOURCE).toString('base64')}`;
const browser = await chromium.launch();
try {
    const page = await browser.newPage();
    for (const icon of ICONS) {
        await page.setViewportSize({ width: icon.size, height: icon.size });
        await page.setContent(iconHtml(dataUrl, icon));
        await page.locator('img').evaluate((img) => img.decode());
        await page.screenshot({ path: `${OUT_DIR}${icon.name}`, omitBackground: !icon.fill });
    }
} finally {
    await browser.close();
}

const imageMagick = findImageMagick();
for (const { name } of ICONS) {
    if (imageMagick) optimise(imageMagick, `${OUT_DIR}${name}`);
    console.log(`public/${name}`);
}
console.log(imageMagick ? `已用 ${imageMagick} 無損壓縮` : '冇 ImageMagick：跳過壓縮');
