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

const BLUR_SUPPORTS =
    '@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) and (color: color-mix(in srgb, red, blue))';

describe('sleep timer sheet styles', () => {
    it('should paint the panel 80% opaque with a backdrop blur from tokens, solid where unsupported', () => {
        const sheet = cssDeclarations(sheetCss, '.sheet');
        const blurred = atRuleDeclarations(sheetCss, BLUR_SUPPORTS, '.sheet');
        expect(tokens['--sleep-timer-sheet-opacity']).toBe('80%');
        expect(tokens['--sleep-timer-sheet-blur']).toBe('14px');
        expect(sheet.background).toBe('var(--color-surface)');
        expect(sheet['backdrop-filter']).toBeUndefined();
        expect(tight(blurred.background)).toBe(
            'color-mix(in srgb, var(--color-surface) var(--sleep-timer-sheet-opacity), transparent)',
        );
        expect(blurred['backdrop-filter']).toBe('blur(var(--sleep-timer-sheet-blur))');
        expect(blurred['-webkit-backdrop-filter']).toBe('blur(var(--sleep-timer-sheet-blur))');
    });

    // v2.0.2（#286）起 HomeView 主頁冇播放卡（淨係把手），卡嘅選單（data-side）唔會喺 HomeView 出現
    it('should keep no HomeView override for the home card sheet', () => {
        expect(atRuleDeclarations(sheetCss, SQUARE, ".overlay[data-side='true']")).toEqual({});
    });

    it('should lay the options out on 6 columns: numbers span 2, the bottom row spans 3', () => {
        expect(cssDeclarations(sheetCss, '.options')['grid-template-columns']).toBe(
            'repeat(6, minmax(0, 1fr))',
        );
        expect(cssDeclarations(sheetCss, '.caption')['grid-column']).toBe('span 6');
        expect(cssDeclarations(sheetCss, ".option[data-kind='number']")['grid-column']).toBe(
            'span 2',
        );
        expect(cssDeclarations(sheetCss, ".option[data-kind='wide']")['grid-column']).toBe(
            'span 3',
        );
    });

    it('should draw unselected options as muted text in a grey outline, no fill', () => {
        const option = cssDeclarations(sheetCss, '.option');
        expect(option.background).toBe('transparent');
        expect(option.border).toBe('var(--sleep-timer-option-border) solid var(--color-track)');
        expect(option.color).toBe('var(--color-text-muted)');
    });

    it('should draw the selected option with a solid cream outline and bigger cream bold text', () => {
        const selected = cssDeclarations(sheetCss, ".option[aria-pressed='true']");
        expect(selected['border-color']).toBe('var(--color-accent)');
        expect(selected['border-style']).toBe('solid');
        expect(selected.color).toBe('var(--color-accent-text)');
        expect(
            cssDeclarations(sheetCss, ".option[aria-pressed='true'] .optionLabel")['font-size'],
        ).toBe('var(--sleep-timer-option-selected-size)');
        expect(
            cssDeclarations(
                sheetCss,
                ".option[data-kind='number'][aria-pressed='true'] .optionLabel",
            )['font-size'],
        ).toBe('var(--sleep-timer-number-selected-size)');
        expect(tokens['--sleep-timer-option-selected-size']).toBe('calc(19px * var(--ui-scale))');
        expect(tokens['--sleep-timer-number-size']).toBe('calc(19px * var(--ui-scale))');
        expect(tokens['--sleep-timer-number-selected-size']).toBe('calc(22px * var(--ui-scale))');
    });

    it('should draw the nightly schedule with a dashed cream outline and cream text', () => {
        const scheduled = cssDeclarations(sheetCss, ".option[data-scheduled='true']");
        expect(scheduled['border-color']).toBe('var(--color-accent)');
        expect(scheduled['border-style']).toBe('dashed');
        expect(scheduled.color).toBe('var(--color-accent-text)');
    });

    it('should show the remaining time bold and the scheduled time faded, top right', () => {
        expect(cssDeclarations(sheetCss, '.status').color).toBe('var(--color-accent-text)');
        expect(cssDeclarations(sheetCss, ".status[data-kind='remaining']")['font-weight']).toBe(
            '700',
        );
        const scheduled = cssDeclarations(sheetCss, ".status[data-kind='scheduled']");
        expect(scheduled['font-weight']).toBe('500');
        expect(scheduled.opacity).toBe('var(--sleep-timer-scheduled-opacity)');
        expect(tokens['--sleep-timer-scheduled-opacity']).toBe('0.7');
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
