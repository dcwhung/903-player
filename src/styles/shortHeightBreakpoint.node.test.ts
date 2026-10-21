// @vitest-environment node
// 要用 node:fs 讀 CSS / e2e 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { e2eShortHeightPx, maxHeightBreakpoints, readCss } from '../../tests/cssRule';

/*
 * 好矮畫面（橫向手機、矮視窗、200% 放大）嘅斷點：tokens.css 喺度收細唱片、少預留一行集數，
 * e2e/run.mjs（SHORT_HEIGHT_PX）跟住放寬清單行數 / 唱片下限。
 * 任何高度都係固定版面，所以其他 CSS 唔可以再有呢個斷點（例如以前嘅成頁捲、畀返 pan-y）。
 * @media 條件用唔到 custom property，所以唔抽 token，靠呢個測試鎖住兩邊一樣。
 */
describe('short-height breakpoint', () => {
    it('should read a whole-pixel breakpoint from the e2e runner', () => {
        expect(Number.isInteger(e2eShortHeightPx())).toBe(true);
    });

    it('should use the same short-height max-height as SHORT_HEIGHT_PX in tokens.css', () => {
        const css = readCss(new URL('./tokens.css', import.meta.url));

        expect(maxHeightBreakpoints(css)).toContain(e2eShortHeightPx());
    });

    it.each([
        ['Page.module.css', '../pages/Page.module.css'],
        ['HomePage.module.css', '../pages/HomePage.module.css'],
        ['ShowCardStack.module.css', '../components/ShowCardStack/ShowCardStack.module.css'],
        ['DateStrip.module.css', '../components/DateStrip/DateStrip.module.css'],
    ])('should keep %s fixed at every height (no short-height override)', (_name, path) => {
        const css = readCss(new URL(path, import.meta.url));

        // 手機打橫（SHORT_LANDSCAPE_QUERY）係另一套兩欄版面，唔係直版矮螢幕嘅覆寫
        expect(maxHeightBreakpoints(css, { excludeLandscape: true })).toEqual([]);
    });
});
