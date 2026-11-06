// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, mediaQueries, readCss } from '../../../tests/cssRule';

const css = readCss(new URL('./HomePage.module.css', import.meta.url));

/*
 * 主頁底部留位（T8）：有 mini player（HomePage 喺 <main> 加 data-mini-player）先留佢個位。
 * 冇 mini player（_mockups_/home-fill-bottom A）：所有 tab 都留 mini player 平時離 viewport 底嘅距離
 * （同收藏 tab、短提示一樣），節目格 / 書架 / 最近收聽都去到底；闊橫版（冇底部 mini player）都一樣
 */
describe('home bottom space', () => {
    it('should leave only the mini player offset on every tab when no mini player is shown', () => {
        expect(cssDeclarations(css, 'main.home')['padding-bottom']).toBe(
            'var(--mini-player-offset-bottom)',
        );
    });

    it('should leave the same bottom space on the wide landscape home', () => {
        expect(cssDeclarations(css, 'main.wide')['padding-bottom']).toBe(
            'var(--mini-player-offset-bottom)',
        );
    });

    it('should reserve the mini player height, its offset and one gap while it shows', () => {
        expect(cssDeclarations(css, 'main.home[data-mini-player]')['padding-bottom']).toBe(
            'calc( var(--home-mini-player-height) + var(--mini-player-offset-bottom) + var(--space-3) )',
        );
    });

    // 同一條留位式（d1eada2），淨係換高度：多段錄音有指示點，得一段（例如廣播劇）冇
    it.each([
        ['multi', 'var(--mini-player-height)'],
        ['single', 'var(--mini-player-height-single)'],
    ])('should take the %s mini player height', (mode, height) => {
        expect(
            cssDeclarations(css, `main.home[data-mini-player='${mode}']`)[
                '--home-mini-player-height'
            ],
        ).toBe(height);
    });

    it('should use the same rule in every orientation (no @media override)', () => {
        expect(mediaQueries(css)).toEqual([]);
    });

    // 收藏 tab 以前自己一條規則（v1.28.2）：而家所有 tab 共用 main.home，唔再分開
    it('should not keep a saved-tab-only bottom rule', () => {
        expect(css).not.toContain(':has([data-saved-mode])');
    });
});
