// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../tests/cssRule';

const badgeCss = readCss(new URL('./NewBadge.module.css', import.meta.url));
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

describe('新 badge', () => {
    const base = cssDeclarations(badgeCss, '.badge');
    const md = cssDeclarations(badgeCss, '.md');

    it('should size and colour the badge with tokens instead of hardcoded values', () => {
        expect(md.padding).not.toMatch(/\dpx/);
        expect(md['line-height']).not.toMatch(/\dpx/);
        expect(base.background).not.toMatch(/#/);
        expect(base.color).not.toMatch(/#/);
    });

    it('should be a red pill with white text, without the old dot', () => {
        expect(resolve(base.background)).toBe('#c0362c');
        expect(resolve(base.color)).toBe('#ffffff');
        expect(resolve(md.padding)).toBe('2px 8px');
        expect(resolve(md['line-height'])).toBe('16px');
        expect(cssDeclarations(badgeCss, '.badge::before')).toEqual({});
    });
});
