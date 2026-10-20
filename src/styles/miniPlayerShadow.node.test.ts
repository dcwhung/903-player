// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../tests/cssRule';

const tokens = readCss(new URL('./tokens.css', import.meta.url));
// 主頁 mini player 卡底離 viewport 底最少嘅距離（iOS viewport 矮咗、安全區扣晒時）= --space-4
const MIN_CARD_GAP_PX = 16;

/*
 * iOS standalone 嘅 viewport 矮過螢幕：viewport 底邊會切走陰影，下面露出嘅 canvas 冇陰影，
 * 陰影伸到邊就見到一條深色縫。陰影向下最遠 ≈ y 位移 + 模糊半徑，要收喺卡底間距入面
 */
describe('mini player shadow', () => {
    it('should stop above the viewport edge below the floating card', () => {
        const shadow = cssDeclarations(tokens, ':root, [data-theme-scope]')['--shadow-floating'];
        const [, y, blur] = (shadow ?? '').split(/\s+/).map((part) => parseFloat(part));

        expect(Number(y) + Number(blur)).toBeLessThan(MIN_CARD_GAP_PX);
    });
});
