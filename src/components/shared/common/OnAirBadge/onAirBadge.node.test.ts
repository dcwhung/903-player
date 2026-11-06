// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import {
    atRuleDeclarations,
    atRuleSelectors,
    cssDeclarations,
    readCss,
} from '../../../../../tests/cssRule';

const css = readCss(new URL('./OnAirBadge.module.css', import.meta.url));
const tokensCss = readCss(new URL('../../../../styles/tokens.css', import.meta.url));
const tokens = cssDeclarations(tokensCss, ':root');
const NO_PREFERENCE = '@media (prefers-reduced-motion: no-preference)';

describe('播放中 pill + 左邊條（ON AIR combo）', () => {
    it('should define the on-air colours and pulse from existing transition tokens', () => {
        expect(tokens['--color-on-air']).toBe('#c8102e');
        expect(tokens['--color-on-on-air']).toBe('#ffffff');
        expect(tokens['--onair-lamp']).toBe('#ff3b30');
        expect(tokens['--onair-pulse']).toBe('calc(var(--view-transition-move) * 3)');
    });

    // 暫停嘅灰條：一隻灰色喺淺色 / 深色清單同收藏框都過唔到 3:1，按 scheme 揀（深 #9a9a9a、淺 #6e6e6e）
    it('should give the idle bar a neutral grey per colour scheme', () => {
        expect(cssDeclarations(tokensCss, ':root, [data-theme-scope]')['--onair-lamp-idle']).toBe(
            '#9a9a9a',
        );
        expect(cssDeclarations(tokensCss, "[data-scheme='light']")['--onair-lamp-idle']).toBe(
            '#6e6e6e',
        );
    });

    it('should paint the pill with tokens and no outline ring', () => {
        const badge = cssDeclarations(css, '.badge');
        expect(badge.background).toBe('var(--color-on-air)');
        expect(badge.color).toBe('var(--color-on-on-air)');
        expect(badge['border-radius']).toBe('var(--radius-full)');
        expect(badge['box-shadow']).toBeUndefined();
    });

    it('should keep static bar heights outside the motion query (reduced motion = still)', () => {
        expect(cssDeclarations(css, '.bar:nth-child(1)').transform).toBe('scaleY(0.55)');
        expect(cssDeclarations(css, '.bar:nth-child(2)').transform).toBe('scaleY(1)');
        expect(cssDeclarations(css, '.bar:nth-child(3)').transform).toBe('scaleY(0.75)');
        expect(cssDeclarations(css, '.bar').animation).toBeUndefined();
        expect(cssDeclarations(css, '.lamp').animation).toBeUndefined();
        expect(cssDeclarations(css, '.lamp').background).toBe('var(--onair-lamp)');
        expect(cssDeclarations(css, ".lamp[data-on-air-lamp='idle']").background).toBe(
            'var(--onair-lamp-idle)',
        );
    });

    it('should animate the equaliser and the live bar glow only without a reduced-motion request', () => {
        expect(atRuleSelectors(css, NO_PREFERENCE)).toEqual([
            '.bar',
            '.bar:nth-child(2)',
            '.bar:nth-child(3)',
            ".lamp[data-on-air-lamp='live']",
        ]);
        expect(atRuleDeclarations(css, NO_PREFERENCE, '.bar').animation).toContain(
            'var(--onair-pulse)',
        );
        expect(
            atRuleDeclarations(css, NO_PREFERENCE, ".lamp[data-on-air-lamp='live']").animation,
        ).toContain('var(--onair-pulse)');
    });
});
