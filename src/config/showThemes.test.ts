import { SHOWS } from './shows';
import { NEUTRAL_THEME, SHOW_THEMES, themeFor, themeVars } from './showThemes';

describe('showThemes', () => {
    it('defines a theme with artwork for every show', () => {
        SHOWS.forEach((show) => {
            expect(SHOW_THEMES[show.id].art).toBeTruthy();
            expect(SHOW_THEMES[show.id].accent).toMatch(/^#[0-9a-f]{6}$/i);
        });
    });

    it('falls back to the neutral theme', () => {
        expect(themeFor(undefined)).toBe(NEUTRAL_THEME);
        expect(themeFor('gongzi')).toBe(SHOW_THEMES.gongzi);
    });

    it('turns a theme into CSS custom properties', () => {
        const vars = themeVars(SHOW_THEMES.badgirl);

        expect(vars['--theme-bg']).toBe('#21151a');
        expect(vars['--theme-accent']).toBe('#f08a24');
        expect(Object.keys(vars).every((key) => key.startsWith('--theme-'))).toBe(true);
    });
});
