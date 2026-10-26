// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, mediaQueries, readCss } from '../../tests/cssRule';

const css = readCss(new URL('./HomePage.module.css', import.meta.url));

/*
 * 主頁底部留位（T8）：有 mini player（HomePage 喺 <main> 加 data-mini-player）先留佢個位，
 * 冇就淨係留安全區 + 一格，任何方向都一樣（以前只係手機打橫有呢個例外，直版永遠留住個空位）
 */
describe('home bottom space', () => {
    it('should leave only the safe area and one gap when no mini player is shown', () => {
        expect(cssDeclarations(css, 'main.home')['padding-bottom']).toBe(
            'calc(env(safe-area-inset-bottom) + var(--space-3))',
        );
    });

    it('should reserve the mini player height, its offset and one gap while it shows', () => {
        expect(cssDeclarations(css, 'main.home[data-mini-player]')['padding-bottom']).toBe(
            'calc( var(--mini-player-height) + var(--mini-player-offset-bottom) + var(--space-3) )',
        );
    });

    it('should use the same rule in every orientation (no @media override)', () => {
        expect(mediaQueries(css)).toEqual([]);
    });
});
