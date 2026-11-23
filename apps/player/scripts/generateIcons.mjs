// 由 assets/app-icon.png 重新生成 public/ 入面嘅 PWA icon（同 admin 卡上內建 maskable 預覽）：node scripts/generateIcons.mjs
// 用 Playwright（devDependency，e2e 已經用緊）嘅 Chromium 縮放同截圖，唔使另外裝圖片工具。
// 有 ImageMagick（magick / convert）就順手做無損壓縮（去 metadata、最高 zlib 壓縮），冇就跳過。
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { chromiumExecutablePath } from './chromiumLaunch.mjs';
import { centerSquareCrop, ICON_BACKGROUND } from './iconLayout.mjs';

// assets/app-icon.png：icon 嘅開發原圖（generateIcons 同 test 讀佢，唔係 Vite build input）
const SOURCE = fileURLToPath(new URL('../assets/app-icon.png', import.meta.url));
const OUT_DIR = fileURLToPath(new URL('../public/', import.meta.url));
// admin「App 外觀」卡用內建圖示時嘅 Android 預覽（唔由 admin 直接引用 player 路徑，所以生成一份副本）
const ADMIN_ICON_DIR = fileURLToPath(new URL('../../admin/src/assets/icon/', import.meta.url));
const OG_ICON_QUALITY = 88;

/**
 * fill：底色（冇就透明）；scale：圖佔邊長幾多；dir：輸出 folder（預設 player public/）。
 * apple-touch-icon 唔支援透明（iOS 會填黑），所以填底色再放大少少蓋走原圖圓角外嘅透明位。
 * maskable：同 admin 自訂 maskable（iconRender.drawIcon）一樣滿版（用戶 2026-11-17）：原圖置中正方形裁切
 * 畫滿成張 canvas，底色只喺透明位後面見到；唔再縮入 80% 安全區，Android 圓形 / 方形遮罩都唔會見到四邊空位。
 */
const ICONS = [
    { name: 'icon-192.png', size: 192, scale: 1 },
    { name: 'icon-512.png', size: 512, scale: 1 },
    { name: 'icon-maskable-512.png', size: 512, maskable: true },
    { name: 'icon-maskable-192.png', size: 192, maskable: true, dir: ADMIN_ICON_DIR },
    { name: 'apple-touch-icon.png', size: 180, scale: 1.02, fill: ICON_BACKGROUND },
    { name: 'favicon.png', size: 64, scale: 1 },
    // 分享預覽（og:image）：同 apple-touch-icon 一樣滿版，WhatsApp 細縮圖先睇得清；jpg 細啲
    {
        name: 'og-icon.jpg',
        size: 512,
        scale: 1.02,
        fill: ICON_BACKGROUND,
        quality: OG_ICON_QUALITY,
    },
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

/** PNG IHDR 嘅闊高（signature 8 bytes + length 4 + type 4 之後） */
const pngSize = (bytes) => ({ width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });

/** 同 admin drawIcon 一樣：先填底色，再將裁切框拉滿成張 canvas；回傳 PNG bytes */
const renderMaskable = async (page, { size }) => {
    await page.setContent('<html><body style="margin:0"></body></html>');
    const base64 = await page.evaluate(
        async ({ src, size, crop, background }) => {
            const image = new Image();
            image.src = src;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext('2d');
            context.imageSmoothingQuality = 'high';
            context.fillStyle = background;
            context.fillRect(0, 0, size, size);
            context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, size, size);
            return canvas.toDataURL('image/png').split(',')[1];
        },
        {
            src: dataUrl,
            size,
            crop: centerSquareCrop(pngSize(sourceBytes)),
            background: ICON_BACKGROUND,
        },
    );
    return Buffer.from(base64, 'base64');
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

const sourceBytes = readFileSync(SOURCE);
const dataUrl = `data:image/png;base64,${sourceBytes.toString('base64')}`;
const outPath = (icon) => `${icon.dir ?? OUT_DIR}${icon.name}`;
const browser = await chromium.launch({ executablePath: chromiumExecutablePath() });
try {
    const page = await browser.newPage();
    for (const icon of ICONS) {
        if (icon.maskable) {
            writeFileSync(outPath(icon), await renderMaskable(page, icon));
            continue;
        }
        await page.setViewportSize({ width: icon.size, height: icon.size });
        await page.setContent(iconHtml(dataUrl, icon));
        await page.locator('img').evaluate((img) => img.decode());
        await page.screenshot({
            path: outPath(icon),
            omitBackground: !icon.fill,
            quality: icon.quality,
        });
    }
} finally {
    await browser.close();
}

const imageMagick = findImageMagick();
for (const icon of ICONS) {
    // 淨係 png 做無損壓縮；jpg 已經由 quality 壓
    if (imageMagick && icon.name.endsWith('.png')) optimise(imageMagick, outPath(icon));
    console.log(outPath(icon));
}
console.log(imageMagick ? `已用 ${imageMagick} 無損壓縮` : '冇 ImageMagick：跳過壓縮');
