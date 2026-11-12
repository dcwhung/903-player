// @vitest-environment node
// 要用 node:fs 讀 CSS 原文（Vitest 會將 .css?raw 變做空字串）
/*
 * Banner / 碟面框線：淨係編輯頁圖片區（ImageSlot）同上載預覽 dialog（原圖、裁切後）有框，
 * 有圖冇圖都係虛線；碟面係圓形虛線框。其他地方（列表、chip、標題碟面…）唔要框（對比 ≥ 3:1 UI 組件）
 */
import { readFileSync } from 'node:fs';

const cssOf = (name: string) =>
    readFileSync(new URL(`./${name}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const bodyOf = (css: string, selector: string) =>
    css
        .split('}')
        .map((rule) => rule.split('{'))
        .filter(([selectors = '']) => selectors.split(',').some((sel) => sel.trim() === selector))
        .map(([, body = '']) => body)
        .join(';');

describe('image slot border', () => {
    it('should define --media-border for light and both dark blocks', () => {
        expect(cssOf('tokens.css').match(/--media-border:\s*#[0-9a-f]{6};/gi)).toHaveLength(3);
    });

    it('should frame filled and empty slots with a dashed --media-border', () => {
        const theme = cssOf('theme.css');
        expect(bodyOf(theme, '.img-slot')).toMatch(/border:\s*2px dashed var\(--media-border\)/);
        expect(bodyOf(theme, '.img-slot.empty')).toMatch(
            /border:\s*2px dashed var\(--media-border\)/,
        );
    });

    it('should frame both panes of the crop preview with dashes, the disc result as a dashed circle', () => {
        const theme = cssOf('theme.css');
        expect(bodyOf(theme, '.crop .frame')).toMatch(/border:\s*2px dashed var\(--media-border\)/);
        const disc = bodyOf(theme, '.crop .out.disc');
        expect(disc).toMatch(/border:\s*2px dashed var\(--media-border\)/);
        expect(disc).toMatch(/border-radius:\s*50%/);
    });

    it('should use --media-border only on those frames', () => {
        const users = cssOf('theme.css')
            .split('}')
            .filter((rule) => rule.includes('var(--media-border)'))
            .flatMap((rule) => (rule.split('{')[0] ?? '').split(','))
            .map((selector) => selector.trim());
        expect(users.sort()).toEqual(
            ['.crop .frame', '.crop .out.disc', '.img-slot', '.img-slot.empty'].sort(),
        );
    });
});
