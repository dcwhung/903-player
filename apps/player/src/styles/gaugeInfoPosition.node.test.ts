// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../tests/cssRule';
import { LANDSCAPE_QUERY } from '../config/layout';

/*
 * T7（2026-11-16）：橫版右欄好闊，ⓘ 貼住欄右邊就離唱片好遠；改為喺唱片格旁邊。
 * T7b（同日用戶要求）：ⓘ 要喺進度圈外面，唔可以壓住圈嘅範圍：掣左邊 = 唱片格（圈）右邊 + --space-2，
 * 頂同唱片格頂齊。1024×768 / 1280×800 唱片按欄闊 88% 計，兩邊淨係剩 31–42px，放唔落一粒掣：
 * 橫版唱片闊兩邊再預留 --gauge-info-room（間距 + 掣闊），ⓘ 先唔會出咗欄又唔使壓住圈。
 * 直版照舊離畫面右邊 --space-3（同頁頭返回掣離左邊一樣）
 */
const tokens = readCss(new URL('./tokens.css', import.meta.url));
const page = readCss(new URL('../pages/shared/Page.module.css', import.meta.url));
const panel = readCss(
    new URL('../components/shared/player/PlayerPanel/PlayerPanel.module.css', import.meta.url),
);

describe('gauge info button position', () => {
    it('should keep the portrait position off the screen edge', () => {
        expect(cssDeclarations(panel, '.info').right).toBe(
            'calc(var(--space-3) - var(--page-edge-reserve, 0px))',
        );
    });

    it('should sit just outside the progress ring in landscape, keeping its touch size', () => {
        const landscape = cssDeclarations(panel, '.info', LANDSCAPE_QUERY);
        expect(landscape).toEqual({
            right: 'max(0px, calc(50% - var(--player-disc-size) / 2 - var(--gauge-info-room)))',
        });
        expect(cssDeclarations(panel, '.info').width).toBe('var(--touch-target)');
        expect(cssDeclarations(panel, '.info').height).toBe('var(--touch-target)');
    });

    it('should size the room beside the ring as one gap plus the touch target', () => {
        expect(cssDeclarations(tokens, ':root')['--gauge-info-room']).toBe(
            'calc(var(--space-2) + var(--touch-target))',
        );
    });

    it('should leave that room on both sides of the landscape disc so the button fits in the column', () => {
        const column = cssDeclarations(page, '.playerColumn', LANDSCAPE_QUERY);
        expect(column['--player-disc-width']).toBe(
            'min( calc(100cqw * var(--landscape-disc-fill)), calc(100cqw - 2 * var(--gauge-info-room)) )',
        );
    });

    it('should cap the today page disc by the same room so it never outgrows the show page disc', () => {
        const today = cssDeclarations(page, '.todayColumn', LANDSCAPE_QUERY);
        expect(today['--player-disc-width']).toBe(
            'min( calc(100cqw - 2 * var(--card-stack-gutter)), calc(100cqw - 2 * var(--gauge-info-room)) )',
        );
    });
});
