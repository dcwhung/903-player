// @vitest-environment node
// 要用 node:fs 讀 CSS 原文（Vitest 會將 .css?raw 變做空字串）
/* 編輯頁 Banner / 碟面 slot 要有清楚邊框（有圖冇圖、淺色深色都要；對比 ≥ 3:1 UI 組件） */
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

    it('should frame filled and empty slots with --media-border', () => {
        const theme = cssOf('theme.css');
        expect(bodyOf(theme, '.img-slot')).toMatch(/border:\s*2px solid var\(--media-border\)/);
        expect(bodyOf(theme, '.img-slot.empty')).toMatch(
            /border:\s*2px dashed var\(--media-border\)/,
        );
    });

    it('should frame both panes of the crop preview', () => {
        expect(bodyOf(cssOf('theme.css'), '.crop .frame')).toMatch(
            /border:\s*2px solid var\(--media-border\)/,
        );
    });
});
