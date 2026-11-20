// @vitest-environment node
// jsdom 唔套用 CSS module：9c 夜間顏色 / 過場 / 叫醒遮罩（用戶 2026-11-20）直接讀 CSS 原文斷言
import {
    atRuleDeclarations,
    atRuleSelectors,
    cssDeclarations,
    readCss,
} from '../../../../../tests/cssRule';

const css = readCss(new URL('./Ambient.module.css', import.meta.url));
const tokens = cssDeclarations(
    readCss(new URL('../../../../styles/tokens.css', import.meta.url)),
    ':root',
);
const NO_MOTION_PREF = '@media (prefers-reduced-motion: no-preference)';
/** prettier 會將長值摺行：比較前收返 */
const tight = (value: string | undefined): string =>
    (value ?? '').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+/g, ' ');

describe('ambient night styles (9c)', () => {
    it('should fade 60 s, wake veil 3 s, from tokens', () => {
        expect(tokens['--ambient-night-fade']).toBe('60s');
        expect(tokens['--ambient-wake-fade']).toBe('3s');
    });

    it('should darken the app palette with the mixes the user picked', () => {
        expect(tokens['--ambient-night-bg-mix']).toBe('16%');
        expect(tokens['--ambient-night-text-mix']).toBe('42%');
        expect(tokens['--ambient-night-gold-mix']).toBe('46%');
        expect(tokens['--ambient-night-muted-mix']).toBe('30%');
        expect(tokens['--ambient-night-tint-mix']).toBe('84%');
        expect(tokens['--ambient-night-disc-opacity']).toBe('0.28');
        const palette = cssDeclarations(css, '.nightPalette');
        expect(tight(palette['--ambient-night-bg'])).toBe(
            'color-mix(in srgb, var(--ambient-home-bg) var(--ambient-night-bg-mix), var(--ambient-night-shade))',
        );
    });

    it('should switch both the backdrop tint colour and percentage at night (S-1371)', () => {
        const night = cssDeclarations(css, '.overlay[data-ambient-night] .scope');
        expect(night['--color-bg']).toBe('var(--ambient-night-bg)');
        expect(night['--ambient-backdrop-tint-mix']).toBe('var(--ambient-night-tint-mix)');
        expect(tight(cssDeclarations(css, '.backdrop::after').background)).toBe(
            'color-mix(in srgb, var(--color-bg) var(--ambient-backdrop-tint-mix), transparent)',
        );
    });

    it('should only transition when motion is allowed (reduced motion switches instantly)', () => {
        expect(cssDeclarations(css, '.scope').transition).toBeUndefined();
        expect(cssDeclarations(css, '.scope')['transition-duration']).toBeUndefined();
        const selectors = atRuleSelectors(css, NO_MOTION_PREF).join(',');
        expect(selectors).toContain('.scope');
        expect(selectors).toContain('.nightLevel');
        expect(selectors).toContain('.backdrop::after');
    });

    it('should never block the page under the wake veil and fade it only when motion is allowed', () => {
        const veil = cssDeclarations(css, '.veil');
        expect(veil['pointer-events']).toBe('none');
        expect(veil.opacity).toBe('0');
        expect(veil.animation).toBeUndefined();
        expect(atRuleDeclarations(css, NO_MOTION_PREF, '.veil').animation).toBe(
            'ambient-veil-out var(--ambient-wake-fade) var(--ambient-night-ease) both',
        );
    });
});
