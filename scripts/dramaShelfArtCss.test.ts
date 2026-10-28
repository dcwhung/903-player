// @vitest-environment node
// 放喺 scripts/：要用 node:fs 讀 CSS（見 launchThemeTokens.test.ts）
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** `.art { … }` 嗰段宣告 */
const artBlock = (css: string) => /\n\.art\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';

describe('DramaShelf .art CSS', () => {
    // CUI-0004：Safari 唔理 draggable 屬性，滑鼠捽書架要靠 CSS 擋拖圖片；iOS 長撳唔出圖片選單
    it('should stop Safari dragging the tile art and showing the long-press callout', () => {
        const cssPath = fileURLToPath(
            new URL('../src/components/DramaShelf/DramaShelf.module.css', import.meta.url),
        );
        const block = artBlock(readFileSync(cssPath, 'utf8'));

        expect(block).toMatch(/-webkit-user-drag:\s*none;/);
        expect(block).toMatch(/-webkit-touch-callout:\s*none;/);
    });
});
