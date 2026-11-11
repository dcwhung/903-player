// @vitest-environment node
// 要用 node:fs 讀 CSS 原文（Vitest 會將 .css?raw 變做空字串）
/*
 * 收合 nav 左上角 app icon：圓形框（50%）包住原 icon，icon 1:1 唔變形（object-fit: contain）。
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
    it('should frame the icon in a round surface badge that beats the mini nav link padding', () => {
        const body = bodyOf('.shell.mini .nav .logo-mini');
        expect(body).toMatch(/border-radius:\s*50%/);
        expect(body).toMatch(/background:\s*var\(--surface\)/);
        expect(body).toMatch(/padding:\s*\d+px/);
    });

    it('should keep the icon square and undistorted', () => {
        const body = bodyOf('.nav .logo-mini img');
        expect(body).toMatch(/object-fit:\s*contain/);
        expect(body).toMatch(/aspect-ratio:\s*1/);
    });
});
