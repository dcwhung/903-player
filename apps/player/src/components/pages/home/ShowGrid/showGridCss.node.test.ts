// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { atRuleDeclarations, cssDeclarations, readCss } from '../../../../../tests/cssRule';

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

    // S-935：欄數只喺 TS（portraitColumns）定，經 inline --show-grid-columns 畀 CSS，唔再寫死 2
    it('should lay out the portrait columns from the inline column count', () => {
        const grid = cssDeclarations(css, '.grid');
        expect(grid['grid-template-columns']).toBe(
            'repeat(var(--show-grid-columns), minmax(0, 1fr))',
        );
        // 橫跨格高要用 100cqi（.grid 內容闊）
        expect(grid['container-type']).toBe('inline-size');
    });

    /*
     * S-935：未量到 / 極矮唔填滿（冇 data-fill）時，橫跨格高 = 其他格嘅高（一欄闊 × 9 / 16，扣埋欄距），
     * 唔係兩倍比例（會多咗欄距 × 9 / 32）。將 100cqi / token 代入條式計返數，同一欄 16:9 比
     */
    it.each([1, 2, 3])(
        'should keep an unmeasured spanning tile exactly one %i-column 16:9 row tall',
        (columns) => {
            const span = cssDeclarations(
                css,
                '.grid:not([data-fill])[data-span-last] > :last-child',
            );
            const contentPx = 361;
            const gapPx = 12;
            expect(cssDeclarations(css, '.grid').gap).toBe('var(--home-tile-gap)');
            expect(span['aspect-ratio']).toBe('auto');
            const expression = (span.height ?? '')
                .replace('100cqi', String(contentPx))
                .replaceAll('var(--show-grid-columns)', String(columns))
                .replaceAll('var(--home-tile-gap)', String(gapPx))
                .replaceAll('var(--tile-aspect-w)', '16')
                .replaceAll('var(--tile-aspect-h)', '9')
                .replaceAll('calc', '');
            expect(expression).toMatch(/^[\d\s.()+\-*/]+$/);
            const columnPx = (contentPx - (columns - 1) * gapPx) / columns;
            expect(Number(new Function(`return ${expression}`)())).toBeCloseTo((columnPx * 9) / 16);
        },
    );

    // 唔支援 cqi 嘅舊瀏覽器：退返用比例（欄距差少少），欄數照跟 inline --show-grid-columns
    it('should fall back to a column-count ratio where cqi is not supported', () => {
        expect(
            atRuleDeclarations(
                css,
                '@supports not (width: 1cqi)',
                '.grid:not([data-fill])[data-span-last] > :last-child',
            )['aspect-ratio'],
        ).toBe('calc(var(--show-grid-columns) * var(--tile-aspect-w)) / var(--tile-aspect-h)');
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
        expect(
            cssDeclarations(
                css,
                '.grid:not([data-fill])[data-span-last] > :last-child',
                '(orientation: landscape) and (min-width: 640px)',
            ).height,
        ).toBe('auto');
    });
});
