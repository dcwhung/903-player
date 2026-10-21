// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../tests/cssRule';

const tile = readCss(new URL('./ShowTile.module.css', import.meta.url));
const tokens = cssDeclarations(
    readCss(new URL('../../styles/tokens.css', import.meta.url)),
    ':root',
);

const VAR = /var\((--[\w-]+)\)/g;

/**
 * var(--x) 換做 tokens.css 入面嘅值（token 再引用 token 就再換，例如 --ui-scale），
 * 直版倍數係 1，`calc(8px * 1)` 收返做 `8px`，睇返視覺上係咪同之前一樣
 */
const resolve = (value: string | undefined): string => {
    let text = value ?? '';
    while (text.includes('var(--')) {
        text = text.replace(VAR, (_, name: string) => tokens[name] ?? name);
    }
    return text.replace(/calc\((\d+px) \* 1\)/g, '$1');
};

describe('New badge', () => {
    const badge = cssDeclarations(tile, '.newBadge');
    const dot = cssDeclarations(tile, '.newBadge::before');

    it('should size the badge with tokens instead of hardcoded px', () => {
        expect(badge.padding).not.toMatch(/\dpx/);
        expect(badge['line-height']).not.toMatch(/\dpx/);
        expect(dot.width).not.toMatch(/\dpx/);
        expect(dot.height).not.toMatch(/\dpx/);
    });

    it('should keep the same look', () => {
        expect(resolve(badge.padding)).toBe('2px 8px 2px 6px');
        expect(resolve(badge['line-height'])).toBe('16px');
        expect(resolve(dot.width)).toBe('6px');
        expect(resolve(dot.height)).toBe('6px');
    });
});
