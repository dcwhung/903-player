// @vitest-environment node
// 短提示離頁底幾遠（用戶 iPhone 截圖，v1.28.1）：要讀 CSS 原文，見 tests/cssRule
import { cssDeclarations, readCss } from '../../../../../tests/cssRule';

const toast = readCss(new URL('./Toast.module.css', import.meta.url));
const tokens = readCss(new URL('../../../../styles/tokens.css', import.meta.url));

describe('toast bottom offset', () => {
    // 冇 mini player：以前留咗 40px + 安全區，好似預留咗 mini player 個位、浮得太高。
    // 而家同 mini player 平時離 viewport 底一樣（安全區照 mini player 計法扣返 viewport 差距）
    it('should sit where the mini player would when there is no mini player', () => {
        expect(cssDeclarations(tokens, ':root')['--toast-offset-bottom']).toBe(
            'var(--mini-player-offset-bottom)',
        );
        expect(cssDeclarations(toast, '.toast').bottom).toBe('var(--toast-offset-bottom)');
    });

    // 有 mini player：照舊浮喺佢上面
    it('should keep floating above the mini player while it shows', () => {
        expect(
            cssDeclarations(toast, ':global(html:has(main[data-mini-player])) .toast').bottom,
        ).toBe(
            'calc(var(--mini-player-height) + var(--mini-player-offset-bottom) + var(--space-3))',
        );
    });
});
