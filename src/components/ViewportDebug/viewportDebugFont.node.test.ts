// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../tests/cssRule';

const panelCss = readCss(new URL('./ViewportDebug.module.css', import.meta.url));
const tokens = cssDeclarations(
    readCss(new URL('../../styles/tokens.css', import.meta.url)),
    ':root',
);

// W-463：字型要用 token，唔可以喺 component 寫死字型 stack
describe('viewport debug panel font', () => {
    it('should use the mono font token instead of a hardcoded font stack', () => {
        expect(cssDeclarations(panelCss, '.panel')['font-family']).toBe('var(--font-family-mono)');
    });

    it('should define the mono font token as a monospace stack', () => {
        expect(tokens['--font-family-mono']).toMatch(/monospace$/);
    });
});
