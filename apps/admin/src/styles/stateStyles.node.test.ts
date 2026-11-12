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

/** selector 清單包含 selector 嘅 rule body（全部合埋） */
const bodyOf = (selector: string) =>
    theme
        .split('}')
        .map((rule) => rule.split('{'))
        .filter(([selectors = '']) => selectors.split(',').some((sel) => sel.trim() === selector))
        .map(([, body = '']) => body)
        .join(';');

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

    // 0.6.3 bug：揀咗嘅快速套用 chip hover 時底色變 --surface-2，白字（深色 = 深字）睇唔到
    it('should keep the selected preset chip solid, hover included', () => {
        for (const selector of [
            ".presets button[aria-pressed='true']",
            ".presets button[aria-pressed='true']:hover:not(:disabled)",
        ]) {
            const body = bodyOf(selector);
            expect(body).toMatch(/background:\s*var\(--primary\)/);
            expect(body).toMatch(/color:\s*var\(--on-primary\)/);
        }
    });
});

/*
 * chip 類掣（快速套用、類型 switch、排程短篇 tab）：
 * - 揀咗（aria-pressed）用實色 --primary 底 + --on-primary 白字，hover 都唔變（之前 hover 蓋咗底色 → 白字淺底睇唔到）
 * - disabled 唔用 opacity（0.45 透明令對比跌穿 3:1），改用 --muted 字 + --surface-2 淺底
 */
describe('chip buttons', () => {
    it.each(['.presets', '.switch'])(
        'should paint the pressed %s chip solid primary, hover included',
        (group) => {
            for (const selector of [
                `${group} button[aria-pressed='true']`,
                `${group} button[aria-pressed='true']:hover:not(:disabled)`,
            ]) {
                const body = bodyOf(selector);
                expect(body).toMatch(/background:\s*var\(--primary\)/);
                expect(body).toMatch(/color:\s*var\(--on-primary\)/);
            }
        },
    );

    it.each(['.presets', '.switch', '.arc-tabs'])(
        'should give disabled %s chips muted text on a light surface, fully opaque',
        (group) => {
            const body = bodyOf(`${group} button:disabled`);
            expect(body).toMatch(/opacity:\s*1/);
            expect(body).toMatch(/color:\s*var\(--muted\)/);
            expect(body).toMatch(/background:\s*var\(--surface-2\)/);
        },
    );
});

/*
 * 未上架（從未發佈、下架）：灰色中性 pill + 灰點，同紅色「已下架」分開；
 * 狀態 pill 唔可以有 hover 效果（用戶規則）
 */
describe('未上架 status', () => {
    it('should paint the 未上架 pill and dots neutral grey', () => {
        expect(bodyOf('.pill.unlisted')).toMatch(/background:\s*var\(--surface-2\)/);
        expect(bodyOf('.pill.unlisted')).toMatch(/color:\s*var\(--muted\)/);
        expect(bodyOf('.thumb.st-unlisted::after')).toMatch(/background:\s*var\(--muted\)/);
        expect(bodyOf('.legend .dot.unlisted')).toMatch(/background:\s*var\(--muted\)/);
    });

    it('should give status pills no hover rule', () => {
        expect(theme).not.toMatch(/\.pill[^{]*:hover/);
    });
});
