// @vitest-environment node
// 要用 node:fs 讀 component 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別）
/*
 * S-764：catalog 圖（節目 / 劇集 / 短篇圖，flag 開咗就由 Worker 跨 origin 出）一律用 CORS 模式載入，
 * SW 先可以只 cache status 200（唔再 cache opaque）。逐個 component 掃 <img>，全部要帶 crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}。
 * 主頁橫額本來係 app 內建圖（豁免），Phase 4 起可以係 catalog banner（R2），一樣要 CORS
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../', import.meta.url));
/** 主頁橫額（Phase 4 起可以係 catalog banner）：以前豁免，而家一定要有 */
const BANNER_COMPONENTS = [
    'components/pages/home/HomeBanner/HomeBanner.tsx',
    'components/pages/home/HomeLandscapeGrid/CoverBanner.tsx',
    'components/pages/home/HomeLandscapeGrid/FittedBanner.tsx',
];
const IMG_TAG = /<img\b[^>]*?\/>/gs;

const componentFiles = (): string[] =>
    readdirSync(join(SRC, 'components'), { recursive: true, encoding: 'utf8' })
        .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'))
        .map((file) =>
            relative(SRC, join(SRC, 'components', file))
                .split('\\')
                .join('/'),
        );

describe('catalog <img> CORS mode', () => {
    const files = componentFiles();
    const tags = files.flatMap((file) =>
        [...readFileSync(join(SRC, file), 'utf8').matchAll(IMG_TAG)].map((m) => ({
            file,
            tag: m[0],
        })),
    );

    it('should find the catalog image components, banners included', () => {
        const files = new Set(tags.map(({ file }) => file));
        expect(BANNER_COMPONENTS.filter((file) => !files.has(file))).toEqual([]);
        expect(tags.length).toBeGreaterThan(BANNER_COMPONENTS.length);
    });

    it('should load every catalog image with crossOrigin', () => {
        const missing = tags
            .filter(({ tag }) => !tag.includes('crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}'))
            .map(({ file }) => file);
        expect(missing).toEqual([]);
    });
});
