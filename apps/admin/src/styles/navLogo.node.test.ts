// @vitest-environment node
// 要用 node:fs 讀 CSS 原文（Vitest 會將 .css?raw 變做空字串）
/*
 * 收合 nav 左上角 app icon：直接顯示完整 app icon（原本嘅圓角方形），唔加圓形底、唔裁切、唔變形。
 * 之前 `.shell.mini .nav a { padding: 12px 0 }` 蓋咗 .logo-mini 嘅 padding → 48×48 框入面 icon 變 48×24（壓扁）
 */
import { readFileSync } from 'node:fs';

const theme = readFileSync(new URL('./theme.css', import.meta.url), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
);

const bodyOf = (selector: string) =>
    theme
        .split('}')
        .map((rule) => rule.split('{'))
        .filter(([selectors = '']) => selectors.split(',').some((sel) => sel.trim() === selector))
        .map(([, body = '']) => body)
        .join(';');

describe('collapsed nav app icon', () => {
    it('should show the whole icon with no badge behind it, beating the mini nav link padding', () => {
        const body = bodyOf('.shell.mini .nav .logo-mini');
        expect(body).toMatch(/padding:\s*0/);
        expect(body).toMatch(/background:\s*none/);
        expect(body).toMatch(/overflow:\s*visible/);
        expect(body).not.toMatch(/border-radius:\s*50%/);
    });

    it('should keep the icon square and undistorted', () => {
        const body = bodyOf('.nav .logo-mini img');
        expect(body).toMatch(/object-fit:\s*contain/);
        expect(body).toMatch(/aspect-ratio:\s*1/);
    });
});
