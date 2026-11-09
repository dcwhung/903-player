// @vitest-environment node
// 要用 node:fs 讀 component 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別）
/*
 * S-764：catalog 圖（節目 / 劇集 / 短篇圖，flag 開咗就由 Worker 跨 origin 出）一律用 CORS 模式載入，
 * SW 先可以只 cache status 200（唔再 cache opaque）。逐個 component 掃 <img>：
 * 除咗 app 自己嘅主頁橫額（bundled，唔係 catalog），全部要帶 crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../', import.meta.url));
/** 主頁橫額：app 內建圖（BANNER_IMAGES / bannerImage），唔係 catalog */
const BUNDLED_IMAGE_COMPONENTS = [
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

    it('should find the catalog image components', () => {
        expect(tags.length).toBeGreaterThan(BUNDLED_IMAGE_COMPONENTS.length);
    });

    it('should load every catalog image with crossOrigin', () => {
        const missing = tags
            .filter(({ file }) => !BUNDLED_IMAGE_COMPONENTS.includes(file))
            .filter(({ tag }) => !tag.includes('crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}'))
            .map(({ file }) => file);
        expect(missing).toEqual([]);
    });

    it('should leave the bundled banners alone (no layout / attribute change)', () => {
        const touched = tags.filter(
            ({ file, tag }) =>
                BUNDLED_IMAGE_COMPONENTS.includes(file) && tag.includes('crossOrigin'),
        );
        expect(touched).toEqual([]);
    });
});
