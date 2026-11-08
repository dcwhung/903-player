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

    /*
     * W-702：headerRule / titleFont 會原封不動入 CSS custom property（劇集頁 background / font-family），
     * remote catalog 唔可以借佢叫 app 去其他 host 攞資源。白名單：gradient / calc、hex 色、數字單位、關鍵字
     */
    describe('headerRule / titleFont whitelist (W-702)', () => {
        const withTheme = (extra: Record<string, string>) => ({ theme: { ...DARK, ...extra } });

        // library/ 現有全部 headerRule（6 個）同 titleFont
        it.each([
            'none',
            'linear-gradient(#c0362c, #c0362c) 0 100% / 100% 1px no-repeat, linear-gradient(#c0362c, #c0362c) 0 calc(100% - 3px) / 100% 1px no-repeat',
            'linear-gradient(90deg, #af7a08, #f2c21b, #af7a08) 0 100% / 100% 3px no-repeat',
            'linear-gradient(90deg, #d45f32 0 60%, #8fbcb2 60%) 0 100% / 100% 3px no-repeat',
            'linear-gradient(90deg, #e7010e, #1a1a1a) 0 100% / 100% 3px no-repeat',
            'linear-gradient(90deg, #f5b400 0 60%, #2b3fb6 60%) 0 100% / 100% 3px no-repeat',
            'radial-gradient(circle, #f7901e 1.5px, transparent 2px) 0 100% / 8px 4px repeat-x',
            'repeating-linear-gradient(to right, #FFF 0 2px, transparent 2px 4px)',
            'linear-gradient(#000, #fff) 0 calc((100% - 2px) * 0.5) / 100% 1px no-repeat',
        ])('accepts headerRule %s', (headerRule) => {
            expect(readTheme(ctx, withTheme({ headerRule })).headerRule).toBe(headerRule);
        });

        it.each([
            ['url()', 'url(http://tracker.invalid/p.gif)'],
            ['url() after a gradient', 'linear-gradient(#000, #fff), url(/p.gif)'],
            ['upper-case URL()', 'URL(https://a.example/p.gif)'],
            ['a bare http URL', 'http://tracker.invalid/p.gif'],
            ['protocol-relative //', '//tracker.invalid/p.gif'],
            ['image-set()', 'image-set("p.png" 1x)'],
            ['-webkit-image-set()', '-webkit-image-set(p.png 1x)'],
            ['image()', 'image(p.png)'],
            ['element()', 'element(#x)'],
            ['an unknown function', 'cross-fade(#000, #fff)'],
            ['a vendor gradient', '-webkit-linear-gradient(#000, #fff)'],
            ['a function glued to a keyword', 'xcalc(1px)'],
            ['a CSS escape', 'u\\72 l(p.gif)'],
            ['a double quote', 'linear-gradient("#000", #fff)'],
            ['a single quote', "linear-gradient('#000', #fff)"],
            ['a semicolon', 'none; color: red'],
            ['a colon', 'a:b'],
            ['var()', 'var(--x)'],
        ])('rejects headerRule with %s', (_label, headerRule) => {
            expect(() => readTheme(ctx, withTheme({ headerRule }))).toThrow(
                'theme.headerRule must be',
            );
        });

        it.each(["'Noto Serif TC', serif", 'serif', '"思源宋體", "Noto Serif TC", serif'])(
            'accepts titleFont %s',
            (titleFont) => {
                expect(readTheme(ctx, withTheme({ titleFont })).titleFont).toBe(titleFont);
            },
        );

        it.each([
            ['url()', 'url(http://tracker.invalid/f.woff2)'],
            ['a CSS escape', 'a\\28 b'],
            ['a semicolon', 'serif; background: red'],
            ['a slash', 'a/b'],
            ['a colon', 'a:b'],
        ])('rejects titleFont with %s', (_label, titleFont) => {
            expect(() => readTheme(ctx, withTheme({ titleFont }))).toThrow(
                'theme.titleFont must be',
            );
        });
    });
});
