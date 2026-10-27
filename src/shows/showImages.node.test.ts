// @vitest-environment node
// 要用 node:fs 讀圖檔頭：*.node.test.ts 行 tsconfig.node.json（有 Node 型別）
import { readdirSync, readFileSync, statSync } from 'node:fs';

/*
 * 節目圖統一尺寸：主頁 tile 16:9（同短篇長方形圖一樣）、碟面正方形（同廣播劇碟面一樣）；對住 WebP 檔頭鎖住。
 * 唔 import ./index（.webp import 喺 node 環境冇 Vite 處理），直接讀 show.json
 */
const SHOWS = new URL('./', import.meta.url);
const TILE_SIZE: [number, number] = [1216, 684];
const DISC_SIZE: [number, number] = [600, 600];

/** WebP 檔頭讀闊高：VP8（有損）同 VP8X（擴展）兩種 */
const webpSize = (file: URL): [number, number] => {
    const data = readFileSync(file);
    const chunk = data.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return [data.readUIntLE(24, 3) + 1, data.readUIntLE(27, 3) + 1];
    if (chunk === 'VP8 ') return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff];
    throw new Error(`未支援嘅 WebP chunk：${chunk}`);
};

const showIds = readdirSync(SHOWS).filter((name) => statSync(new URL(name, SHOWS)).isDirectory());

const imagesOf = (id: string) =>
    JSON.parse(readFileSync(new URL(`${id}/show.json`, SHOWS), 'utf8')) as {
        tile: string;
        disc: string;
    };

describe('show image sizes', () => {
    it('finds all seven shows', () => {
        expect(showIds).toHaveLength(7);
    });

    it.each(showIds)('sizes the %s tile at 1216×684 and its disc at 600×600', (id) => {
        const { tile, disc } = imagesOf(id);
        expect(webpSize(new URL(`${id}/${tile}`, SHOWS))).toEqual(TILE_SIZE);
        expect(webpSize(new URL(`${id}/${disc}`, SHOWS))).toEqual(DISC_SIZE);
    });
});
