// @vitest-environment node
// 要用 node:fs 讀 CSS 原文（Vitest 會將 .css?raw 變做空字串）
/*
 * 發佈 / 部署記錄：「修改」狀態 pill 列晒改了哪些欄位（可能好長，例如兩個短篇）。
 * 全域 .pill 係 nowrap，第 4 欄 auto → 長 pill 會逼窄名欄甚至溢出（S-996），所以呢度要換行
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

describe('history change pill', () => {
    it('should wrap a long field list instead of overflowing the row', () => {
        const body = bodyOf('.hist-row .changes .pill');
        expect(body).toMatch(/white-space:\s*normal/);
        expect(body).toMatch(/max-width:/);
    });
});
