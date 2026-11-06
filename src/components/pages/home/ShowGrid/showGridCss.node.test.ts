// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../../../tests/cssRule';

const css = readCss(new URL('./ShowGrid.module.css', import.meta.url));
const tokens = readCss(new URL('../../../../styles/tokens.css', import.meta.url));

/*
 * 直版節目格填到底（_mockups_/home-fill-bottom B3）：每行最多高到 16:9 嘅 1.5 倍（以前 1.3），
 * 再有剩就由 CSS 平分做行距（grid-template-rows 係 inline 嘅 n 條固定行，最後一頁少格都係 n 條，
 * 所以每頁行位一樣），最尾一行貼住頁底
 */
describe('ShowGrid fill to the bottom (B3)', () => {
    it('should let a row grow up to 1.5× its 16:9 height', () => {
        expect(cssDeclarations(tokens, ':root')['--show-tile-max-grow']).toBe('1.5');
    });

    it('should share any height left over as row gaps once the rows are measured', () => {
        expect(cssDeclarations(css, '.grid[data-fill]')['align-content']).toBe('space-between');
    });

    // 未量到（冇 data-fill）照由頂排，唔好將 16:9 格散開
    it('should keep unmeasured grids packed at the top', () => {
        expect(cssDeclarations(css, '.grid')['align-content']).toBe('start');
    });
});
