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

    // W-857：60 秒過場淨係夜間切換緊先有，日間暫停 / 換色調唔可以跟住慢
    it('should scope every 60 s transition to the night switch (data-ambient-night-fading)', () => {
        const nightFadeRules = atRuleSelectors(css, NO_MOTION_PREF).filter(
            (selector) =>
                atRuleDeclarations(css, NO_MOTION_PREF, selector)['transition-duration'] ===
                'var(--ambient-night-fade)',
        );
        const parts = nightFadeRules.flatMap((selector) =>
            selector.split(',').map((s) => s.trim()),
        );
        expect(parts.length).toBeGreaterThan(0);
        expect(
            parts.filter((part) => !part.startsWith('.overlay[data-ambient-night-fading] ')),
        ).toEqual([]);
        expect(parts).toContain('.overlay[data-ambient-night-fading] .discBox > :last-child');
        expect(parts).toContain('.overlay[data-ambient-night-fading] .ringFill');
        expect(parts).toContain('.overlay[data-ambient-night-fading] .scope');
    });

    it('should keep linear easing for the long fade (S-1390)', () => {
        expect(tokens['--ambient-night-ease']).toBe('linear');
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
