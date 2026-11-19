// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, mediaQueries, readCss } from '../../../tests/cssRule';
import { DUO_OPEN_PORTRAIT_QUERY, DUO_QUERY } from '../../config/layout';

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

    // iPhone Duo（P10）例外：main 喺 ThemeScope 邊框入面，留位扣返邊框（W-786），唔係按方向改規則；
    // 打開・直嗰段淨係放寬主頁闊度（lane 5a），唔郁底部留位
    it('should use the same rule in every orientation (no @media override except the Duo inset)', () => {
        expect(mediaQueries(css)).toEqual([DUO_QUERY, DUO_OPEN_PORTRAIT_QUERY]);
        expect(
            cssDeclarations(css, 'main.home', DUO_OPEN_PORTRAIT_QUERY)['padding-bottom'],
        ).toBeUndefined();
    });

    it('should only subtract the Duo edge inset inside the Duo block', () => {
        const duo = (selector: string) =>
            cssDeclarations(css, selector, DUO_QUERY)['padding-bottom'];

        expect(duo('main.home')).toBe(
            'calc(var(--mini-player-offset-bottom) - var(--duo-edge-inset))',
        );
        expect(duo('main.wide')).toBe(
            'calc(var(--mini-player-offset-bottom) - var(--duo-edge-inset))',
        );
        expect(duo('main.home[data-mini-player]')).toBe(
            'calc( var(--home-mini-player-height) + var(--mini-player-offset-bottom) - var(--duo-edge-inset) + var(--space-3) )',
        );
    });

    // 收藏 tab 以前自己一條規則（v1.28.2）：而家所有 tab 共用 main.home，唔再分開
    it('should not keep a saved-tab-only bottom rule', () => {
        expect(css).not.toContain(':has([data-saved-mode])');
    });
});
