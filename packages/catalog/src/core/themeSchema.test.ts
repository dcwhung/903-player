import { readTheme } from './themeSchema';

const ctx = { id: 'x', source: 'x.json', files: new Set<string>() };
const DARK = {
    bg: '#21151a',
    surface: '#2e1e24',
    track: '#4a3540',
    accent: '#f08a24',
    onAccent: '#21151a',
    title: '#f6c987',
    text: '#f6eee8',
    muted: '#c2aaa6',
    shadowDark: '#160d11',
    shadowLight: '#352329',
};

describe('readTheme', () => {
    it('reads a dark theme with only the ten required colours', () => {
        expect(readTheme(ctx, { theme: DARK })).toEqual(DARK);
    });

    it('keeps the light-theme extras when present', () => {
        const light = {
            ...DARK,
            scheme: 'light',
            statusBar: '#a84800',
            accentText: '#a84800',
            titleFont: "'Noto Serif TC', serif",
            headerRule: 'none',
        };
        expect(readTheme(ctx, { theme: light })).toEqual(light);
    });

    it.each([
        ['a missing colour', { ...DARK, muted: undefined }, 'theme.muted must be a #rrggbb colour'],
        ['a named colour', { ...DARK, bg: 'black' }, 'theme.bg must be a #rrggbb colour'],
        [
            'a bad optional colour',
            { ...DARK, statusBar: 'red' },
            'theme.statusBar must be a #rrggbb colour',
        ],
        ['a dark scheme', { ...DARK, scheme: 'dark' }, 'theme.scheme must be one of light'],
        [
            'an empty titleFont',
            { ...DARK, titleFont: '' },
            'theme.titleFont must be a non-empty string',
        ],
    ])('rejects %s', (_label, theme, message) => {
        expect(() => readTheme(ctx, { theme })).toThrow(message);
    });

    it('names the field it was read from', () => {
        expect(() => readTheme(ctx, { palette: 1 }, 'palette')).toThrow(
            'palette must be an object',
        );
    });
});
