// @vitest-environment node
// HomeView（SQUARE_QUERY）集數 / 短篇 / 全集表（P10 v2.0.1 用戶反饋截圖 28）：
// 跟內容高、最高 75%（--square-sheet-max-height），闊度同資料 sheet 一樣（--page-max-width 置中），唔再全闊
import { cssDeclarations, readCss } from '../../../../../tests/cssRule';
import { SQUARE_QUERY } from '../../../../config/layout';

const tokens = readCss(new URL('../../../../styles/tokens.css', import.meta.url));
const SHEETS = [
    ['ListSheet', readCss(new URL('./ListSheet.module.css', import.meta.url))],
    [
        'ArcSheet',
        readCss(new URL('../../../pages/drama/ArcSheet/ArcSheet.module.css', import.meta.url)),
    ],
] as const;
const info = readCss(new URL('../ItemInfo/ItemInfoSheet.module.css', import.meta.url));

describe('HomeView episode sheets size', () => {
    it('should cap the sheets at 75% of the screen', () => {
        expect(cssDeclarations(tokens, ':root')['--square-sheet-max-height']).toBe('75%');
    });

    it.each(SHEETS)('%s: content height up to the cap, as wide as the info sheet', (_name, css) => {
        const sheet = cssDeclarations(css, '.sheet', SQUARE_QUERY);
        expect(sheet.height).toBe('auto');
        expect(sheet['max-height']).toBe('var(--square-sheet-max-height)');
        expect(sheet['max-width']).toBe(cssDeclarations(info, '.sheet')['max-width']);
        expect(sheet.margin).toBe('0 auto');
    });
});
