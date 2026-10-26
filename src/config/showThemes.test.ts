import { HOME_THEME, NEUTRAL_THEME, themeVars, type ShowTheme } from './showThemes';

const LIGHT: ShowTheme = {
    ...NEUTRAL_THEME,
    scheme: 'light',
    accentText: '#a52a24',
    titleFont: "'Noto Serif TC', serif",
    headerRule: 'linear-gradient(#c0362c, #c0362c) 0 100% / 100% 1px no-repeat',
};

describe('themeVars', () => {
    it('turns a theme into --theme-* custom properties', () => {
        const vars = themeVars(HOME_THEME);
        expect(vars['--theme-bg']).toBe(HOME_THEME.bg);
        expect(vars['--theme-accent']).toBe(HOME_THEME.accent);
        expect(Object.keys(vars).every((key) => key.startsWith('--theme-'))).toBe(true);
    });

    it('passes the light-only extras to CSS, with dark-theme defaults', () => {
        const light = themeVars(LIGHT);
        expect(light['--theme-accent-text']).toBe('#a52a24');
        expect(light['--theme-title-font']).toContain('Noto Serif TC');
        expect(light['--theme-header-rule']).toContain('linear-gradient');

        const neutral = themeVars(NEUTRAL_THEME);
        expect(neutral['--theme-accent-text']).toBe(NEUTRAL_THEME.accent);
        expect(neutral['--theme-title-font']).toBe('var(--font-family)');
        expect(neutral['--theme-header-rule']).toBe('none');
    });
});
