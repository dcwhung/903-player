import { NEUTRAL_THEME } from '@903-player/catalog';
import { isNeutralTheme, themeOf, themeStyle } from './theme';

const LANCY = {
    bg: '#f3efde',
    surface: '#faf7ec',
    track: '#e0d6b8',
    accent: '#d45f32',
    onAccent: '#ffffff',
    title: '#a8401a',
    text: '#33281d',
    muted: '#6b5a47',
    shadowDark: '#dcd3b8',
    shadowLight: '#ffffff',
    scheme: 'light',
    accentText: '#a8401a',
    headerRule: 'linear-gradient(90deg, #d45f32 0 60%, #8fbcb2 60%)',
};

describe('themeOf', () => {
    it('should read the theme of a definition', () => {
        expect(themeOf({ theme: LANCY })).toEqual(LANCY);
    });

    it('should fall back to the neutral grey when a definition has no theme', () => {
        expect(themeOf({})).toEqual(
            Object.fromEntries(Object.entries(NEUTRAL_THEME).filter(([key]) => key !== 'art')),
        );
    });
});

describe('isNeutralTheme', () => {
    it('should treat the scanned placeholder theme as 未設定 (case-insensitive, art ignored)', () => {
        const upper = { ...NEUTRAL_THEME, bg: '#141414'.toUpperCase(), art: 'x.webp' };
        expect(isNeutralTheme(upper)).toBe(true);
    });

    it('should not treat a designed theme as neutral', () => {
        expect(isNeutralTheme(themeOf({ theme: LANCY }))).toBe(false);
    });
});

describe('themeStyle', () => {
    it('should expose the theme as --theme-* custom properties for player-style previews', () => {
        const style = themeStyle(themeOf({ theme: LANCY })) as Record<string, string>;
        expect(style['--theme-bg']).toBe('#f3efde');
        expect(style['--theme-on-accent']).toBe('#ffffff');
        expect(style['--theme-accent-text']).toBe('#a8401a');
        expect(style['--theme-header-rule']).toBe(LANCY.headerRule);
    });

    it('should use accent for accent text and no status bar on a dark theme', () => {
        const style = themeStyle(themeOf({})) as Record<string, string>;
        expect(style['--theme-accent-text']).toBe(NEUTRAL_THEME.accent);
        expect(style['--theme-status-bar']).toBe('transparent');
        expect(style['--theme-header-rule']).toBe('none');
    });
});
