// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { motionLeftOnWhenReduced, readCss } from '../../tests/cssRule';

const global = readCss(new URL('./global.css', import.meta.url));

/*
 * 減少動態時 JS 本身唔開過場（utils/viewTransition 嘅 canViewTransition）；CSS 係後備：
 * `::view-transition-old(*):only-child` 嘅淡出 specificity（0,1,0）高過 `::view-transition-old(*)`（0,0,0），
 * reduce block 要連 :only-child 嗰兩條都熄，否則過場一旦開咗照樣淡入淡出
 */
describe('view transition reduced motion fallback', () => {
    it('should switch off every view transition animation when reduced motion is on', () => {
        expect(motionLeftOnWhenReduced(global)).toEqual([]);
    });
});
