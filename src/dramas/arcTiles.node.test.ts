// @vitest-environment node
// 要用 node:fs 讀圖檔頭：*.node.test.ts 行 tsconfig.node.json（有 Node 型別）
import { readFileSync } from 'node:fs';

/*
 * 短篇長方形圖（drama.json arcs[].tile）全部統一 16:9，同劇集 tile 一樣闊；對住 WebP 檔頭鎖住。
 * 唔 import ./index（.webp import 喺 node 環境冇 Vite 處理），直接讀 drama.json
 */
const DRAMAS = new URL('./', import.meta.url);
const ARC_TILE_SIZE: [number, number] = [1216, 684];
/** R2 每個短篇都有 cover photo 嘅劇（芝See 冇） */
const WITH_ARC_COVERS = ['golden', 'sammy-kitty', 'jim', 'lancy'];

/** WebP 檔頭讀闊高：VP8（有損）同 VP8X（擴展）兩種 */
const webpSize = (file: URL): [number, number] => {
    const data = readFileSync(file);
    const chunk = data.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return [data.readUIntLE(24, 3) + 1, data.readUIntLE(27, 3) + 1];
    if (chunk === 'VP8 ') return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff];
    throw new Error(`未支援嘅 WebP chunk：${chunk}`);
};

const arcTilesOf = (id: string): string[] => {
    const def = JSON.parse(readFileSync(new URL(`${id}/drama.json`, DRAMAS), 'utf8')) as {
        arcs: { tile?: string }[];
    };
    return def.arcs.map((arc) => arc.tile ?? '');
};

describe('arc tile sizes', () => {
    it.each(WITH_ARC_COVERS)('sizes every arc tile of %s at 1216×684', (id) => {
        const tiles = arcTilesOf(id);
        expect(tiles.every(Boolean)).toBe(true);
        tiles.forEach((tile) =>
            expect(webpSize(new URL(`${id}/${tile}`, DRAMAS))).toEqual(ARC_TILE_SIZE),
        );
    });
});
