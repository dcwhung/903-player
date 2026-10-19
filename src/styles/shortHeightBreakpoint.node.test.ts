// @vitest-environment node
// 要用 node:fs 讀 CSS / e2e 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { e2eShortHeightPx, maxHeightBreakpoints, readCss } from '../../tests/cssRule';

/*
 * 好矮畫面（橫向手機、矮視窗、200% 放大）改為 main 自己捲嘅斷點，四個地方各自寫死：
 * Page.module.css（成頁捲）、ShowCardStack / DateStrip（touch-action 畀返 pan-y）、
 * e2e/run.mjs（SHORT_HEIGHT_PX）。@media 條件用唔到 custom property，所以唔抽 token，
 * 靠呢個測試鎖住四個值一樣。
 */
describe('short-height breakpoint', () => {
    it('should read a whole-pixel breakpoint from the e2e runner', () => {
        expect(Number.isInteger(e2eShortHeightPx())).toBe(true);
    });

    it.each([
        ['Page.module.css', '../pages/Page.module.css'],
        ['ShowCardStack.module.css', '../components/ShowCardStack/ShowCardStack.module.css'],
        ['DateStrip.module.css', '../components/DateStrip/DateStrip.module.css'],
    ])('should use the same max-height as SHORT_HEIGHT_PX in %s', (_name, path) => {
        const css = readCss(new URL(path, import.meta.url));

        expect(maxHeightBreakpoints(css)).toEqual([e2eShortHeightPx()]);
    });
});
