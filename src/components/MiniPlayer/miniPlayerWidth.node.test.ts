// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../tests/cssRule';
import { LANDSCAPE_QUERY, SHORT_LANDSCAPE_QUERY } from '../../config/layout';

const css = (path: string) => readCss(new URL(path, import.meta.url));
const mini = css('./MiniPlayer.module.css');

/*
 * 手機打橫（T8）：mini player 同主頁格（HomeLandscapeGrid）一樣闊。
 * 主頁格左右邊 = 頁面安全區（Page.module.css 橫版 .page padding）+ --home-gutter（.scroller padding），
 * mini player 嘅 left / right 用返同一條式，唔再收喺 --page-max-width 中間
 */
describe('mini player width on a phone held sideways', () => {
    it.each(['left', 'right'])('should line its %s edge up with the home grid', (side) => {
        expect(cssDeclarations(mini, '.wrapper', SHORT_LANDSCAPE_QUERY)[side]).toBe(
            `calc(env(safe-area-inset-${side}) + var(--home-gutter))`,
        );
    });

    it('should match the gutters the home grid really uses', () => {
        const page = cssDeclarations(css('../../pages/Page.module.css'), '.page', LANDSCAPE_QUERY);
        const grid = cssDeclarations(
            css('../HomeLandscapeGrid/HomeLandscapeGrid.module.css'),
            '.scroller',
        );

        expect(page['padding-left']).toBe('env(safe-area-inset-left)');
        expect(page['padding-right']).toBe('env(safe-area-inset-right)');
        expect(grid.padding).toBe('var(--space-2) var(--home-gutter)');
    });

    it('should stay centred within the page width in portrait and on iPad', () => {
        expect(cssDeclarations(mini, '.wrapper').left).toContain('var(--mini-player-max-width)');
    });
});
