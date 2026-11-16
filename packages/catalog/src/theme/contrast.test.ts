import { NEUTRAL_THEME } from '../showTheme';
import {
    ACCENT_TEXT_MIN_CONTRAST,
    checkThemeContrast,
    contrastRatio,
    relativeLuminance,
    TEXT_MIN_CONTRAST,
    type ContrastTheme,
} from './contrast';

/** WCAG 數字對到小數點後兩個位 */
const DIGITS = 2;

describe('relativeLuminance', () => {
    it.each([
        ['#000000', 0],
        ['#ffffff', 1],
        ['#FFFFFF', 1],
        ['#808080', 0.2158605],
        ['#ff0000', 0.2126],
        ['#00ff00', 0.7152],
        ['#0000ff', 0.0722],
    ])('%s → %f', (hex, expected) => {
        expect(relativeLuminance(hex)).toBeCloseTo(expected, 5);
    });

    it.each(['', '#fff', '#12345', '#gggggg', 'ffffff', '#ffffff00'])(
        'should return null for an unreadable colour %j',
        (hex) => {
            expect(relativeLuminance(hex)).toBeNull();
        },
    );
});

describe('contrastRatio', () => {
    it.each([
        ['#000000', '#ffffff', 21],
        ['#ffffff', '#000000', 21],
        ['#777777', '#ffffff', 4.48],
        ['#767676', '#ffffff', 4.54],
        ['#ff0000', '#ffffff', 4],
        ['#123456', '#123456', 1],
    ])('%s on %s → %f', (a, b, expected) => {
        expect(contrastRatio(a, b)).toBeCloseTo(expected, DIGITS);
    });

    it('should return null when either colour is unreadable', () => {
        expect(contrastRatio('#000000', 'red')).toBeNull();
        expect(contrastRatio('nope', '#ffffff')).toBeNull();
    });
});

describe('checkThemeContrast', () => {
    /** 全部合格：黑底白字 + 白強調色黑字 */
    const PASSING: ContrastTheme = {
        bg: '#000000',
        surface: '#111111',
        accent: '#ffffff',
        onAccent: '#000000',
        title: '#ffffff',
        text: '#eeeeee',
        muted: '#aaaaaa',
    };

    it('should expose the WCAG AA thresholds', () => {
        expect(TEXT_MIN_CONTRAST).toBe(4.5);
        expect(ACCENT_TEXT_MIN_CONTRAST).toBe(3);
    });

    it('should return no warnings for a passing theme and the neutral theme', () => {
        expect(checkThemeContrast(PASSING)).toEqual([]);
        expect(checkThemeContrast(NEUTRAL_THEME)).toEqual([]);
    });

    it('should warn for text / title / muted against bg and surface below 4.5', () => {
        const warnings = checkThemeContrast({ ...PASSING, muted: '#444444', surface: '#888888' });
        expect(warnings.map((w) => `${w.foreground}/${w.background}`)).toEqual([
            'muted/bg',
            'title/surface',
            'text/surface',
            'muted/surface',
        ]);
        warnings.forEach((w) => expect(w.minimum).toBe(TEXT_MIN_CONTRAST));
        expect(warnings[0]?.ratio).toBeCloseTo(contrastRatio('#444444', '#000000') ?? 0, DIGITS);
    });

    it('should warn for onAccent against accent below 4.5', () => {
        expect(checkThemeContrast({ ...PASSING, onAccent: '#888888' })).toEqual([
            {
                foreground: 'onAccent',
                background: 'accent',
                ratio: expect.closeTo(contrastRatio('#888888', '#ffffff') ?? 0, DIGITS),
                minimum: TEXT_MIN_CONTRAST,
            },
        ]);
    });

    it('should check accent against bg at 3 when there is no accentText', () => {
        // #555555 on black ≈ 2.82 (fails 3); onAccent white on #555555 ≈ 7.46 (passes)
        const warnings = checkThemeContrast({ ...PASSING, accent: '#555555', onAccent: '#ffffff' });
        expect(warnings).toEqual([
            {
                foreground: 'accent',
                background: 'bg',
                ratio: expect.closeTo(2.82, DIGITS),
                minimum: ACCENT_TEXT_MIN_CONTRAST,
            },
        ]);
    });

    it('should check accentText instead of accent when it is set', () => {
        const dimAccent = { ...PASSING, accent: '#555555', onAccent: '#ffffff' };
        expect(checkThemeContrast({ ...dimAccent, accentText: '#888888' })).toEqual([]);
        expect(
            checkThemeContrast({ ...PASSING, accentText: '#333333' }).map((w) => w.foreground),
        ).toEqual(['accentText']);
    });

    it('should report an unreadable colour as a warning with a null ratio, not throw', () => {
        const warnings = checkThemeContrast({ ...PASSING, bg: 'blue' });
        expect(warnings.map((w) => `${w.foreground}/${w.background}`)).toEqual([
            'title/bg',
            'text/bg',
            'muted/bg',
            'accent/bg',
        ]);
        warnings.forEach((w) => expect(w.ratio).toBeNull());
    });
});
