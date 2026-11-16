// @vitest-environment node
// 要用 node:fs 讀 CSS 原文（Vitest 會將 .css?raw 變做空字串）
/*
 * 更換 App 圖示裁切框（用戶 2026-11-16）：框嘅 999px box-shadow 冇裁，成個 dialog / 頁面變暗，
 * Android 圓框嘅陰影仲變成右邊一條大弧。暗位改由原圖入面嘅 .dim 層畫（overflow 裁走圖外），
 * 框本身唔再有陰影，拉柄唔會俾裁走。實際畫面由 admin e2e 量
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

describe('icon crop dim', () => {
    it('should clip the dim layer to the source image', () => {
        const dim = bodyOf('.icon-crop .dim');
        expect(dim).toMatch(/position:\s*absolute/);
        expect(dim).toMatch(/inset:\s*0/);
        expect(dim).toMatch(/overflow:\s*hidden/);
        expect(dim).toMatch(/pointer-events:\s*none/);
    });

    it('should dim around the hole with the crop mask token', () => {
        expect(bodyOf('.icon-crop .dim-hole')).toMatch(
            /box-shadow:\s*0 0 0 999px var\(--crop-mask\)/,
        );
        expect(bodyOf('.icon-crop .dim-hole.circle')).toMatch(/border-radius:\s*50%/);
    });

    it('should drop the unclipped shadow from the crop box itself', () => {
        expect(bodyOf('.icon-crop .box')).toMatch(/box-shadow:\s*none/);
    });

    it('should keep the source unclipped so the resize grip stays usable', () => {
        expect(bodyOf('.icon-crop .src')).not.toMatch(/overflow/);
    });

    it('should draw the Android safe zone as the middle 80% of the crop box', () => {
        expect(bodyOf('.icon-crop .safe')).toMatch(/inset:\s*10%/);
        expect(bodyOf('.icon-crop .safe')).toMatch(/border-radius:\s*50%/);
    });
});
