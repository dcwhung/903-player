// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../tests/cssRule';

/*
 * T8（2026-11-16，iPhone 主畫面 app 直版）：資料 sheet 簡介之後仲有一大截空白。
 * iOS standalone viewport 可能已經停喺 home indicator 上面（useViewportGap 量到 --viewport-gap-bottom），
 * 但 env(safe-area-inset-bottom) 照報 34px：表底再留一次安全區就變兩倍。
 * 同 mini player 一樣扣返 viewport 差距；表入面唔留 mini player 位（表蓋喺頁面上面）
 */
const tokens = readCss(new URL('./tokens.css', import.meta.url));
const infoSheet = readCss(
    new URL('../components/shared/common/ItemInfo/ItemInfoSheet.module.css', import.meta.url),
);
const arcSheet = readCss(
    new URL('../components/pages/drama/ArcSheet/ArcSheet.module.css', import.meta.url),
);

describe('bottom sheet bottom inset', () => {
    it('should define the visible safe area as the inset minus the standalone viewport gap', () => {
        expect(cssDeclarations(tokens, ':root')['--safe-area-bottom-visible']).toBe(
            'max( 0px, calc(env(safe-area-inset-bottom) - var(--viewport-gap-bottom, 0px)) )',
        );
    });

    it('should pad the info sheet body by the visible safe area plus normal spacing only', () => {
        expect(cssDeclarations(infoSheet, '.body').padding).toBe(
            '0 0 calc(var(--safe-area-bottom-visible) + var(--space-6))',
        );
    });

    it('should pad the arc sheet list the same way', () => {
        expect(cssDeclarations(arcSheet, '.list').padding).toBe(
            '0 0 calc(var(--safe-area-bottom-visible) + var(--space-3))',
        );
    });

    it('should not reserve mini player room or a fixed height inside either sheet', () => {
        for (const css of [infoSheet, arcSheet]) {
            expect(css).not.toMatch(/--mini-player/);
            expect(cssDeclarations(css, '.sheet').height).toBeUndefined();
            expect(cssDeclarations(css, '.sheet')['min-height']).toBeUndefined();
        }
    });
});
