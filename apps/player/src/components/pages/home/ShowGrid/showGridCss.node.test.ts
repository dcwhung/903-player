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

    // 用戶確認（_mockups_/dynamic-show-grid）：要分頁先 space-between（最後一頁行位跟第一頁）
    it('should share any height left over as row gaps only when the grid is paged', () => {
        expect(cssDeclarations(css, '.grid[data-fill][data-paged]')['align-content']).toBe(
            'space-between',
        );
    });

    // 一頁放得晒：置頂，剩低高度留喺最底（跟 .grid 嘅 start，唔再拉開行距）
    it('should keep a measured grid that fits on one page packed at the top', () => {
        expect(cssDeclarations(css, '.grid[data-fill]')['align-content']).toBeUndefined();
    });

    // 未量到（冇 data-fill）照由頂排，唔好將 16:9 格散開
    it('should keep unmeasured grids packed at the top', () => {
        expect(cssDeclarations(css, '.grid')['align-content']).toBe('start');
    });
});

/* 直版動態欄數（_mockups_/dynamic-show-grid）：單數格最尾一格（今日節目）橫跨成行；闊橫版唔受影響 */
describe('ShowGrid portrait span (dynamic-show-grid)', () => {
    it('should stretch the last tile across every column when the page is marked', () => {
        expect(cssDeclarations(css, '.grid[data-span-last] > :last-child')['grid-column']).toBe(
            '1 / -1',
        );
    });

    // 未量到 / 極矮唔填滿（冇 data-fill）時格照鎖比例：橫跨格兩倍闊，比例都要兩倍，先唔會高過其他行一倍
    it('should keep an unmeasured spanning tile as tall as one 16:9 row', () => {
        expect(
            cssDeclarations(css, '.grid:not([data-fill])[data-span-last] > :last-child')[
                'aspect-ratio'
            ],
        ).toBe('calc(2 * var(--tile-aspect-w)) / var(--tile-aspect-h)');
    });

    it('should never span a tile in the wide-landscape 4-column grid', () => {
        expect(
            cssDeclarations(
                css,
                '.grid[data-span-last] > :last-child',
                '(orientation: landscape) and (min-width: 640px)',
            )['grid-column'],
        ).toBe('auto');
        expect(
            cssDeclarations(
                css,
                '.grid:not([data-fill])[data-span-last] > :last-child',
                '(orientation: landscape) and (min-width: 640px)',
            )['aspect-ratio'],
        ).toBe('auto');
    });
});
