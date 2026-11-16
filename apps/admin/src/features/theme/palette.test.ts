import { checkThemeContrast, contrastRatio } from '@903-player/catalog';
import {
    buildPool,
    buildTheme,
    CANDIDATES_PER_ROUND,
    deriveAccentText,
    extractPalette,
    toEntryTheme,
} from './palette';

/** n 個同色像素（RGBA） */
const pixels = (...runs: [number, [number, number, number]][]) =>
    new Uint8ClampedArray(
        runs.flatMap(([count, rgb]) => Array.from({ length: count }, () => [...rgb, 255]).flat()),
    );

const LANCY_PALETTE = ['#e9dfc4', '#d45f32', '#8fbcb2', '#3b2a1e', '#b88a5a'];

describe('extractPalette', () => {
    it('should list the main colours by how much of the image they cover', () => {
        const data = pixels([30, [20, 40, 90]], [50, [230, 220, 200]], [20, [210, 90, 50]]);
        expect(extractPalette(data)).toEqual(['#e6dcc8', '#14285a', '#d25a32']);
    });

    it('should merge colours that are too close to each other', () => {
        const data = pixels([50, [200, 200, 200]], [40, [205, 205, 205]], [10, [10, 10, 10]]);
        expect(extractPalette(data)).toHaveLength(2);
    });

    it('should skip transparent pixels', () => {
        const data = new Uint8ClampedArray([255, 0, 0, 0, 0, 0, 255, 255]);
        expect(extractPalette(data)).toEqual(['#0000ff']);
    });
});

describe('deriveAccentText', () => {
    it('should darken a light-theme accent until text on the background passes 4.5:1', () => {
        const text = deriveAccentText('#e8a07a', '#f3efde');
        expect(contrastRatio(text, '#f3efde')).toBeGreaterThanOrEqual(4.5);
    });
});

describe('buildTheme', () => {
    it('should derive statusBar and accentText for a light candidate', () => {
        const theme = buildTheme('#e9dfc4', '#d45f32', 'light');
        expect(theme.scheme).toBe('light');
        expect(theme.statusBar).toBe(theme.accentText);
        expect(contrastRatio(theme.accentText ?? '', theme.bg)).toBeGreaterThanOrEqual(4.5);
    });

    it('should build a dark candidate without light-only fields', () => {
        const theme = buildTheme('#123456', '#ff5a4e', 'dark');
        expect(theme.scheme).toBeUndefined();
        expect(theme.statusBar).toBeUndefined();
        expect(contrastRatio(theme.text, theme.bg)).toBeGreaterThanOrEqual(4.5);
    });
});

describe('buildPool', () => {
    it('should make three rounds of three candidates, alternating base colour × dark / light', () => {
        const pool = buildPool(LANCY_PALETTE);
        expect(pool).toHaveLength(3 * CANDIDATES_PER_ROUND);
        expect(pool.slice(0, CANDIDATES_PER_ROUND).map((c) => c.theme.scheme ?? 'dark')).toEqual([
            'dark',
            'dark',
            'light',
        ]);
    });

    it('should keep most candidates readable (text pairs pass AA)', () => {
        const textFails = buildPool(LANCY_PALETTE).flatMap((c) =>
            checkThemeContrast(c.theme).filter((w) => w.foreground === 'text'),
        );
        expect(textFails).toEqual([]);
    });

    it('should still build candidates from a single-colour image', () => {
        expect(buildPool(['#808080'])).toHaveLength(9);
    });
});

describe('toEntryTheme', () => {
    const current = {
        ...buildTheme('#e9dfc4', '#d45f32', 'light'),
        titleFont: "'Noto Serif TC', serif",
        headerRule: 'linear-gradient(90deg, #d45f32 0 60%, #8fbcb2 60%)',
    };

    it('should keep titleFont and headerRule untouched', () => {
        const next = toEntryTheme(buildTheme('#123456', '#ff5a4e', 'dark'), current);
        expect(next.titleFont).toBe(current.titleFont);
        expect(next.headerRule).toBe(current.headerRule);
    });

    it('should drop light-only fields when switching to a dark candidate', () => {
        const next = toEntryTheme(buildTheme('#123456', '#ff5a4e', 'dark'), current);
        expect(next).not.toHaveProperty('scheme');
        expect(next).not.toHaveProperty('statusBar');
        expect(next).not.toHaveProperty('accentText');
    });
});
