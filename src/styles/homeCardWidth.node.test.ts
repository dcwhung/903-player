// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../tests/cssRule';

const home = readCss(new URL('../pages/HomePage.module.css', import.meta.url));

/**
 * 主頁播放卡闊度只跟 --home-pane-ratio：flex item 預設 min-width: auto 會畀入面內容（節目清單行、名）
 * 撐闊，節目同廣播劇張卡就唔一樣闊（用戶實機截圖）
 */
describe('home player card width', () => {
    it('should be a fixed share of the page, never stretched by its content', () => {
        const column = cssDeclarations(home, '.cardColumn');
        expect(column.flex).toBe('0 0 calc(100% * var(--home-pane-ratio))');
        expect(column['min-width']).toBe('0');
    });
});
