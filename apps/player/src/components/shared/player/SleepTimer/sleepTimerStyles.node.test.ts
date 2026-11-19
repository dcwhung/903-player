// @vitest-environment node
// jsdom 唔套用 CSS module：選單底色 / 掣款 / 月亮擺位（用戶 2026-11-19 決定）直接讀 CSS 原文斷言
import { atRuleDeclarations, cssDeclarations, readCss } from '../../../../../tests/cssRule';

const sheetCss = readCss(new URL('./SleepTimerSheet.module.css', import.meta.url));
const buttonCss = readCss(new URL('./SleepTimer.module.css', import.meta.url));
const headerCss = readCss(
    new URL('../../common/PageHeader/PageHeader.module.css', import.meta.url),
);
const tokens = cssDeclarations(
    readCss(new URL('../../../../styles/tokens.css', import.meta.url)),
    ':root',
);
/** prettier 會將長值摺行（「calc(」後面有空格）：比較前收返 */
const tight = (value: string | undefined): string =>
    (value ?? '').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');

const SQUARE =
    '@media (min-width: 520px) and (max-width: 568px) and (min-height: 520px) and (max-height: 568px)';

describe('sleep timer sheet styles', () => {
    it('should paint the panel 80% opaque from a token, keeping a solid fallback', () => {
        const sheet = cssDeclarations(sheetCss, '.sheet');
        expect(tokens['--sleep-timer-sheet-opacity']).toBe('80%');
        expect(
            tight(
                atRuleDeclarations(
                    sheetCss,
                    '@supports (color: color-mix(in srgb, red, blue))',
                    '.sheet',
                ).background,
            ),
        ).toBe(
            'color-mix(in srgb, var(--color-surface) var(--sleep-timer-sheet-opacity), transparent)',
        );
        expect(sheet.background).toBe('var(--color-surface)');
    });

    it('should outline inactive options with the old button colour and no fill', () => {
        const option = cssDeclarations(sheetCss, '.option');
        expect(option.background).toBe('transparent');
        expect(option.border).toBe('var(--sleep-timer-option-border) solid var(--color-track)');
        expect(option.color).toBe('var(--color-text)');
    });

    it('should highlight the last / running option like the now playing date cell: cream border, cream bold text, no fill', () => {
        const active = cssDeclarations(
            sheetCss,
            ".option[data-last='true'], .option[aria-pressed='true']",
        );
        expect(active['border-color']).toBe('var(--color-accent)');
        expect(active.color).toBe('var(--color-accent-text)');
        expect(active.background).toBe('transparent');
    });
});

describe('sleep timer moon placement styles', () => {
    it('should right align the wide home card moon with the expand button and grow leftwards', () => {
        const card = cssDeclarations(buttonCss, ".button[data-placement='card']");
        expect(card.right).toBe('var(--space-2)');
        expect(card['padding-right']).toBe('0');
        expect(card['justify-content']).toBe('flex-end');
    });

    it('should put the HomeView moon right next to the list button + ⓘ pair', () => {
        const pair = atRuleDeclarations(
            headerCss,
            SQUARE,
            ".header:has(> [data-header-actions]) > [data-placement='beside']",
        );
        expect(pair.right).toBe('calc(2 * var(--touch-target))');
    });

    it('should put the HomeView moon right next to a lone list button', () => {
        const lone = atRuleDeclarations(
            headerCss,
            SQUARE,
            ".header:has(> [data-header-actions] > :only-child) > [data-placement='beside']",
        );
        expect(lone.right).toBe('var(--touch-target)');
    });

    it('should give the HomeView title room on both sides while the moon shows at night', () => {
        const night = atRuleDeclarations(
            headerCss,
            SQUARE,
            ".header:has(> [data-header-actions]):has(> [data-placement='beside'])",
        );
        expect(tight(night['grid-template-columns'])).toBe(
            'calc(3 * var(--touch-target)) minmax(0, 1fr) calc(3 * var(--touch-target))',
        );
    });
});
