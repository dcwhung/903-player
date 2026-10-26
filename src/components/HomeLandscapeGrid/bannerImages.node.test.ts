// @vitest-environment node
// 要用 node:fs 讀圖檔頭：*.node.test.ts 行 tsconfig.node.json（有 Node 型別）
import { readFileSync } from 'node:fs';

/*
 * bannerImages.ts 寫死原圖闊高（CSS 未載入圖都要計到幾大）：換圖要同步改，呢度對住 WebP 檔頭鎖住。
 * 唔 import bannerImages.ts（.webp import 喺 node 環境冇 Vite 處理），直接比對數字
 */
const ASSETS = new URL('../../assets/', import.meta.url);

/** WebP 檔頭讀闊高：VP8（有損）同 VP8X（擴展）兩種 */
const webpSize = (file: string): [number, number] => {
    const data = readFileSync(new URL(file, ASSETS));
    const chunk = data.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return [data.readUIntLE(24, 3) + 1, data.readUIntLE(27, 3) + 1];
    if (chunk === 'VP8 ') return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff];
    throw new Error(`未支援嘅 WebP chunk：${chunk}`);
};

describe('banner image sizes', () => {
    it('should match the sizes written in bannerImages.ts', () => {
        expect(webpSize('banner.webp')).toEqual([1200, 517]);
        expect(webpSize('banner-wide.webp')).toEqual([2000, 400]);
    });
});
