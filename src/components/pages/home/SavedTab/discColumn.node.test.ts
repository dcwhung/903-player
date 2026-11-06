// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../../../tests/cssRule';

const css = readCss(new URL('./SavedTab.module.css', import.meta.url));
const tokens = readCss(new URL('../../../../styles/tokens.css', import.meta.url));

/** 用戶要求：收藏段同最近收聽每行嘅碟欄一樣闊，文字起點對齊 */
describe('saved / recent disc column', () => {
    it('should size both discs with the one --saved-disc token', () => {
        expect(cssDeclarations(css, '.section')['grid-template-columns']).toBe(
            'var(--saved-disc) minmax(0, 1fr)',
        );
        expect(cssDeclarations(css, '.recentOpen')['grid-template-columns']).toBe(
            'var(--saved-disc) minmax(0, 1fr)',
        );
        expect(cssDeclarations(css, '.disc').width).toBe('var(--saved-disc)');
        expect(cssDeclarations(css, '.recentDisc').width).toBe('var(--saved-disc)');
        expect(tokens).not.toContain('--saved-recent-disc');
    });

    it('should start the text at the same x: same inset and gap (the panel border is taken off)', () => {
        expect(cssDeclarations(css, '.section').gap).toBe('var(--space-3)');
        expect(cssDeclarations(css, '.recentOpen').gap).toBe('var(--space-3)');
        expect(cssDeclarations(css, '.section').padding).toContain(') var(--space-3) calc(');
        expect(cssDeclarations(css, '.recent')['padding-left']).toBe(
            'calc(var(--space-3) - var(--saved-recent-border))',
        );
        expect(cssDeclarations(css, '.recent').border).toBe(
            'var(--saved-recent-border) dashed var(--saved-line)',
        );
    });
});
