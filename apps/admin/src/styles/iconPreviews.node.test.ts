// @vitest-environment node
// 要用 node:fs 讀 CSS 原文（Vitest 會將 .css?raw 變做空字串）
/*
 * 更換 App 圖示 dialog 嘅預覽列（用戶 2026-11-13）：瀏覽器分頁預覽凸出 dialog、「Android（圓形）」斷兩行。
 * 欄要縮得細過內容（minmax(0, …)），標籤一行，分頁標題太長就省略；實際幾何由 admin e2e 量（1280 / 1100）
 */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./phase4.css', import.meta.url), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
);

const bodyOf = (selector: string) =>
    css
        .split('}')
        .map((rule) => rule.split('{'))
        .filter(([selectors = '']) => selectors.split(',').some((sel) => sel.trim() === selector))
        .map(([, body = '']) => body)
        .join(';');

describe('icon preview row', () => {
    it('should let the columns shrink below their content', () => {
        expect(bodyOf('.even')).toMatch(/grid-auto-columns:\s*minmax\(0,\s*1fr\)/);
        expect(bodyOf('.icon-prev')).toMatch(/min-width:\s*0/);
    });

    it('should keep each label on one line', () => {
        expect(bodyOf('.icon-prev-label')).toMatch(/white-space:\s*nowrap/);
    });

    it('should shrink the icons with the column', () => {
        for (const selector of ['.icon-prev .ios', '.icon-prev .android']) {
            expect(bodyOf(selector)).toMatch(/width:\s*min\(88px,\s*100%\)/);
            expect(bodyOf(selector)).toMatch(/aspect-ratio:\s*1/);
        }
    });

    it('should keep the browser tab inside its column and truncate the title', () => {
        expect(bodyOf('.icon-prev .tab')).toMatch(/max-width:\s*100%/);
        expect(bodyOf('.icon-prev .tab-title')).toMatch(/text-overflow:\s*ellipsis/);
    });

    it('should use a tighter gap in the dialog preview column', () => {
        expect(bodyOf('.icon-dialog .even')).toMatch(/gap:\s*8px/);
    });
});
