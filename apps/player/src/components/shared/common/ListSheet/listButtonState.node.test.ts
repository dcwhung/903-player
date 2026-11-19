// @vitest-environment node
// HomeView 頁頭清單掣（P10 v2.0.2 用戶反饋）：冇揀中狀態，開緊清單同閂咗一樣樣（aria-expanded 照留畀讀屏）
import { cssDeclarations, readCss } from '../../../../../tests/cssRule';

const css = readCss(new URL('./ListButton.module.css', import.meta.url));

describe('ListButton has no selected look', () => {
    it('should not style the button or badge by aria-expanded', () => {
        expect(css).not.toMatch(/\[aria-expanded/);
    });

    it('should keep the transparent button with the accent icon', () => {
        const button = cssDeclarations(css, '.button');
        expect(button.background).toBe('transparent');
        expect(button.color).toBe('var(--color-accent-text)');
    });
});
