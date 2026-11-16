// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../tests/cssRule';
import { LANDSCAPE_QUERY } from '../config/layout';

/*
 * T7（2026-11-16）：橫版右欄好闊，ⓘ 貼住欄右邊就離唱片好遠；改為貼住唱片格右上角。
 * 直版照舊離畫面右邊 --space-3（同頁頭返回掣離左邊一樣）
 */
const panel = readCss(
    new URL('../components/shared/player/PlayerPanel/PlayerPanel.module.css', import.meta.url),
);

describe('gauge info button position', () => {
    it('should keep the portrait position off the screen edge', () => {
        expect(cssDeclarations(panel, '.info').right).toBe(
            'calc(var(--space-3) - var(--page-edge-reserve, 0px))',
        );
    });

    it('should sit at the top-right corner of the disc in landscape, keeping its touch size', () => {
        const landscape = cssDeclarations(panel, '.info', LANDSCAPE_QUERY);
        expect(landscape).toEqual({
            right: 'max(0px, calc(50% - var(--player-disc-size) / 2))',
        });
        expect(cssDeclarations(panel, '.info').width).toBe('var(--touch-target)');
        expect(cssDeclarations(panel, '.info').height).toBe('var(--touch-target)');
    });
});
