// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../tests/cssRule';

const mini = readCss(new URL('./MiniPlayer.module.css', import.meta.url));
const tokens = cssDeclarations(
    readCss(new URL('../../styles/tokens.css', import.meta.url)),
    ':root',
);

/*
 * 得一段錄音（例如廣播劇一集）冇指示點：頂唔使留指示點嘅撳得到範圍，上下 padding 一樣（--space-4），
 * 高度用 --mini-player-height-single（主頁底部留位都係用佢）
 */
describe('single-audio mini player', () => {
    const single = cssDeclarations(mini, ".player[data-mode='single'] .row");

    it('should pad the row the same at the top and the bottom', () => {
        expect(single['padding-top']).toBe('var(--space-4)');
        expect(cssDeclarations(mini, '.row').padding).toBe(
            'var(--touch-target-min) var(--space-3) var(--space-4)',
        );
    });

    it('should be as tall as the play button plus the two paddings', () => {
        expect(single.height).toBe('var(--mini-player-height-single)');
        expect(tokens['--mini-player-height-single']).toBe(
            'calc(var(--touch-target) + var(--space-4) * 2)',
        );
    });
});
