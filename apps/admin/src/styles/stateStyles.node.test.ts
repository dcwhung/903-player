// @vitest-environment node
// 要用 node:fs 讀 CSS 原文（Vitest 會將 .css?raw 變做空字串）
/*
 * 狀態色唔可以俾一般 button:hover（--surface-2 淺灰）蓋過：
 * - 上架 / 下架 toggle hover 時照用綠 / 紅（白字白點先睇到）
 * - 排程 tab 揀咗嘅短篇 chip 用實色 --primary 底 + --on-primary 字，hover 都唔變
 */
import { readFileSync } from 'node:fs';

const theme = readFileSync(new URL('./theme.css', import.meta.url), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
);

/** 搵包含 selector 嘅 rule body */
const bodyOf = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`(?:^|[},])\\s*[^{}]*${escaped}\\s*[,{][^{]*\\{([^}]*)\\}`, 'm').exec(
        theme,
    );
    return match?.[1] ?? '';
};

describe('state colours survive hover', () => {
    it.each([
        ['.toggle.on:hover:not(:disabled)', 'var(--toggle-on)'],
        ['.toggle.off:hover:not(:disabled)', 'var(--toggle-off)'],
    ])('%s should keep background %s', (selector, colour) => {
        expect(bodyOf(selector)).toMatch(
            new RegExp(`background:\\s*${colour.replace(/[()]/g, '\\$&')}`),
        );
    });

    it('should paint the selected arc chip solid primary, hover included', () => {
        for (const selector of [
            ".arc-tabs button[aria-selected='true']",
            ".arc-tabs button[aria-selected='true']:hover:not(:disabled)",
        ]) {
            const body = bodyOf(selector);
            expect(body).toMatch(/background:\s*var\(--primary\)/);
            expect(body).toMatch(/color:\s*var\(--on-primary\)/);
        }
        expect(bodyOf(".arc-tabs button[aria-selected='true'] small")).toMatch(
            /color:\s*var\(--on-primary\)/,
        );
    });
});
