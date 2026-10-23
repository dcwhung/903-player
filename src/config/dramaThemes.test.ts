import { DRAMAS } from './dramas';
import { DRAMA_THEMES, DRAMA_TILE_ART, dramaThemeFor } from './dramaThemes';
import { NEUTRAL_THEME, themeVars } from './showThemes';

const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const WCAG_AA_TEXT = 4.5;
const WHITE = '#ffffff';

/** WCAG relative luminance */
const luminance = (hex: string): number => {
    const [, ...channels] = HEX.exec(hex) ?? [];
    const [r = 0, g = 0, b = 0] = channels.map((c) => {
        const v = parseInt(c, 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};

describe('dramaThemes', () => {
    it('defines a light theme with disc and tile art for every drama', () => {
        DRAMAS.forEach((drama) => {
            const theme = DRAMA_THEMES[drama.id];
            expect(theme.scheme).toBe('light');
            expect(theme.art).toBeTruthy();
            expect(DRAMA_TILE_ART[drama.id]).toBeTruthy();
        });
    });

    it.each(DRAMAS.map((d) => [d.name, DRAMA_THEMES[d.id]] as const))(
        'keeps %s text readable (WCAG AA) on its light surfaces',
        (_, theme) => {
            const pairs: [string, string][] = [
                [theme.text, theme.bg],
                [theme.text, theme.surface],
                [theme.muted, theme.bg],
                [theme.muted, theme.surface],
                [theme.title, theme.bg],
                [theme.title, theme.surface],
                [theme.accentText ?? theme.accent, theme.bg],
                [theme.accentText ?? theme.accent, theme.surface],
                [theme.onAccent, theme.accent],
                // iOS black-translucent 狀態列係白字，畫喺 statusBar 色帶上面
                [WHITE, theme.statusBar ?? theme.bg],
            ];
            pairs.forEach(([fg, bg]) =>
                expect(contrast(fg, bg)).toBeGreaterThanOrEqual(WCAG_AA_TEXT),
            );
        },
    );

    it('falls back to the neutral theme for an unknown drama', () => {
        expect(dramaThemeFor(undefined)).toBe(NEUTRAL_THEME);
        expect(dramaThemeFor('c18')).toBe(DRAMA_THEMES.c18);
    });

    it('passes the light-only extras to CSS, with dark-theme defaults', () => {
        const vars = themeVars(DRAMA_THEMES.c18);
        expect(vars['--theme-accent-text']).toBe(DRAMA_THEMES.c18.accentText);
        expect(vars['--theme-title-font']).toContain('Noto Serif TC');

        const neutral = themeVars(NEUTRAL_THEME);
        expect(neutral['--theme-accent-text']).toBe(NEUTRAL_THEME.accent);
        expect(neutral['--theme-title-font']).toBe('var(--font-family)');
        expect(neutral['--theme-header-rule']).toBe('none');
    });
});
