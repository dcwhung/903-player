// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../../../tests/cssRule';
import { RING_WIDTH, VIEW_BOX_SIZE } from './miniPlayerRing';

const mini = readCss(new URL('./MiniPlayer.module.css', import.meta.url));
const tokens = cssDeclarations(
    readCss(new URL('../../../../styles/tokens.css', import.meta.url)),
    ':root',
);

/*
 * 外圈（SVG，MiniPlayerProgress）同掣嘅實色圓底（CSS .toggle）要對得上：
 * SVG 用播放掣格（--touch-target）做 viewBox，圈粗幼 = --mini-progress-ring；
 * 圓底只畫 content box，padding = 外圈 + 間隔，唔會疊住個圈（jsdom 睇唔到 CSS）
 */
describe('mini player progress ring geometry', () => {
    it('should size the SVG viewBox as the play button cell', () => {
        expect(tokens['--touch-target']).toBe(`calc(${VIEW_BOX_SIZE}px * var(--ui-scale))`);
    });

    it('should draw the ring as thick as the CSS token', () => {
        expect(tokens['--mini-progress-ring']).toBe(`calc(${RING_WIDTH}px * var(--ui-scale))`);
    });

    it('should paint the button disc inside the ring with a gap', () => {
        const toggle = cssDeclarations(mini, '.toggle');
        expect(toggle.width).toBe('var(--touch-target)');
        expect(toggle.height).toBe('var(--touch-target)');
        expect(toggle.padding).toBe('calc(var(--mini-progress-ring) + var(--space-half))');
        expect(toggle['background-clip']).toBe('content-box');
    });

    it('should let taps through the ring to the button', () => {
        expect(cssDeclarations(mini, '.ring')['pointer-events']).toBe('none');
    });
});
