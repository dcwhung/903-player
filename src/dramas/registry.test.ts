import { NEUTRAL_THEME } from '../config/showThemes';
import type { SeriesEpisode } from '../types/drama';
import { buildRegistry } from './registry';
import { DramaSchemaError } from './schema';
import type { DramaFolder, DramaSource } from './source';

const THEME = {
    scheme: 'light',
    bg: '#ffeb85',
    surface: '#fff5c2',
    track: '#f5d23c',
    accent: '#f7901e',
    onAccent: '#2b1a0c',
    title: '#a84800',
    accentText: '#a84800',
    text: '#3b2412',
    muted: '#7a5a20',
    shadowDark: '#e6cc5c',
    shadowLight: '#fff9dc',
    statusBar: '#a84800',
};

const IMAGES = {
    'tile.webp': '/img/tile.webp',
    'disc.webp': '/img/disc.webp',
    's2.webp': '/img/s2.webp',
};

const folder = (id: string, definition: Record<string, unknown>, images = IMAGES): DramaFolder => ({
    id,
    source: `src/dramas/${id}/drama.json`,
    definition,
    images,
});

const series = (name: string, patch: Record<string, unknown> = {}) => ({
    name,
    kind: 'series',
    enabled: true,
    tile: 'tile.webp',
    disc: 'disc.webp',
    audio: { host: 'r2', folder: name, file: '{no2}.m4a' },
    theme: THEME,
    arcs: [
        { name: 'A', episodes: 1 },
        { name: 'B', episodes: 1, disc: 's2.webp' },
    ],
    ...patch,
});

const daily = (name: string, patch: Record<string, unknown> = {}) => ({
    name,
    kind: 'daily',
    enabled: false,
    tile: 'tile.webp',
    disc: 'disc.webp',
    audio: { host: 'app', folder: 'd', file: '{yyyymmdd}.m4a' },
    theme: THEME,
    episodes: [{ date: '2026-10-23' }],
    ...patch,
});

const sourceOf = (...folders: DramaFolder[]): DramaSource => ({ folders: () => folders });

describe('buildRegistry', () => {
    const registry = buildRegistry(
        sourceOf(
            folder('zeta', series('Zeta')),
            folder('alpha', series('Alpha', { order: 2, arcUnit: 'season' })),
            folder('off', daily('Off', { order: 1 })),
            folder('beta', series('Beta')),
        ),
    );

    it('orders dramas by order, then unordered ones by id', () => {
        expect(registry.dramas.map((d) => d.id)).toEqual(['off', 'alpha', 'beta', 'zeta']);
    });

    it('exposes the drama config with theme and tile art attached', () => {
        const alpha = registry.findDrama('alpha');
        expect(alpha).toMatchObject({
            id: 'alpha',
            name: 'Alpha',
            kind: 'series',
            enabled: true,
            arcUnit: 'season',
            tileArt: '/img/tile.webp',
        });
        expect(alpha?.theme).toEqual({ ...THEME, art: '/img/disc.webp' });
        expect(registry.findDrama('off')?.arcUnit).toBeUndefined();
    });

    it('lists only enabled dramas for the home page, but still names a disabled one', () => {
        expect(registry.enabledDramas().map((d) => d.id)).toEqual(['alpha', 'beta', 'zeta']);
        expect(registry.findDrama('off')?.name).toBe('Off');
        expect(registry.findEnabledDrama('off')).toBeUndefined();
        expect(registry.findEnabledDrama('alpha')?.id).toBe('alpha');
        expect(registry.findDrama('nope')).toBeUndefined();
    });

    it('hands out episodes by kind, and nothing for an unknown id', () => {
        expect(registry.dramaEpisodesOf('alpha')).toHaveLength(2);
        expect(registry.seriesEpisodesOf('alpha').map((e) => e.arc)).toEqual(['A', 'B']);
        expect(registry.dailyEpisodesOf('alpha')).toEqual([]);
        expect(registry.dailyEpisodesOf('off')).toHaveLength(1);
        expect(registry.seriesEpisodesOf('off')).toEqual([]);
        expect(registry.dramaEpisodesOf('nope')).toEqual([]);
    });

    it('falls back to the neutral theme for an unknown or missing drama', () => {
        expect(registry.dramaThemeFor(undefined)).toBe(NEUTRAL_THEME);
        expect(registry.dramaThemeFor('nope')).toBe(NEUTRAL_THEME);
        expect(registry.dramaThemeFor('alpha')).toBe(registry.findDrama('alpha')?.theme);
    });

    it('picks arc art, then drama art, then nothing', () => {
        const [a, b] = registry.seriesEpisodesOf('alpha');
        if (!a || !b) throw new Error('missing fixture');
        expect(registry.dramaArtFor(a)).toBe('/img/disc.webp');
        expect(registry.dramaArtFor(b)).toBe('/img/s2.webp');
        expect(registry.dramaArtFor({ ...b, arc: 'C' })).toBe('/img/disc.webp');
        const orphan: SeriesEpisode = { ...b, dramaId: 'nope' };
        expect(registry.dramaArtFor(orphan)).toBe('');
        const [d] = registry.dailyEpisodesOf('off');
        expect(d && registry.dramaArtFor(d)).toBe('/img/disc.webp');
    });

    it('themes a playing episode with its drama colours and its own disc', () => {
        const [, b] = registry.seriesEpisodesOf('alpha');
        if (!b) throw new Error('missing fixture');
        expect(registry.dramaEpisodeTheme(b)).toEqual({ ...THEME, art: '/img/s2.webp' });
    });

    it('rejects two folders with the same id', () => {
        expect(() =>
            buildRegistry(sourceOf(folder('x', series('X')), folder('x', series('X2')))),
        ).toThrow(DramaSchemaError);
    });

    it('reports a broken drama.json with its path', () => {
        expect(() =>
            buildRegistry(sourceOf(folder('bad', series('Bad', { tile: 'nope.webp' })))),
        ).toThrow('src/dramas/bad/drama.json: tile: no file nope.webp in the folder');
    });

    it('is empty for an empty source', () => {
        const empty = buildRegistry(sourceOf());
        expect(empty.dramas).toEqual([]);
        expect(empty.enabledDramas()).toEqual([]);
    });
});
