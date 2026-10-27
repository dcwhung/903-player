import type { Folder, FolderSource } from '../catalog/folderSource';
import { SchemaError } from '../catalog/reader';
import { NEUTRAL_THEME } from '../config/showThemes';
import { airsWeekly, buildShowRegistry, type ShowConfig } from './registry';

const THEME = {
    bg: '#111111',
    surface: '#1c1b19',
    track: '#3a372f',
    accent: '#d4af5a',
    onAccent: '#111111',
    title: '#f2e3b3',
    text: '#f2f0ea',
    muted: '#aba79c',
    shadowDark: '#080808',
    shadowLight: '#24231f',
};

const folder = (id: string, patch: Record<string, unknown> = {}): Folder => ({
    id,
    source: `src/shows/${id}/show.json`,
    definition: {
        name: id.toUpperCase(),
        fileTime: '0900',
        airDays: [1, 2, 3, 4, 5],
        tile: 'tile.webp',
        disc: 'disc.webp',
        theme: THEME,
        ...patch,
    },
    images: { 'tile.webp': `/img/${id}-tile.webp`, 'disc.webp': `/img/${id}-disc.webp` },
});

const sourceOf = (...folders: Folder[]): FolderSource => ({ folders: () => folders });

describe('buildShowRegistry', () => {
    const registry = buildShowRegistry(
        sourceOf(
            folder('zeta'),
            folder('alpha', { order: 2 }),
            folder('sat', { order: 1, airDays: [6], fileTime: '2308' }),
            folder('beta'),
        ),
    );

    it('orders shows by order, then unordered ones by id', () => {
        expect(registry.shows.map((s) => s.id)).toEqual(['sat', 'alpha', 'beta', 'zeta']);
    });

    it('builds the show config with its tile, and its theme with the disc attached', () => {
        expect(registry.findShow('sat')).toEqual({
            id: 'sat',
            name: 'SAT',
            fileTime: '2308',
            airDays: [6],
            tileArt: '/img/sat-tile.webp',
            theme: { ...THEME, art: '/img/sat-disc.webp' },
        });
        expect(registry.findShow('nope')).toBeUndefined();
    });

    it('falls back to the neutral theme for an unknown or missing show', () => {
        expect(registry.themeFor(undefined)).toBe(NEUTRAL_THEME);
        expect(registry.themeFor('nope')).toBe(NEUTRAL_THEME);
        expect(registry.themeFor('alpha')).toBe(registry.findShow('alpha')?.theme);
    });

    it('rejects duplicate ids and reports a broken show.json with its path', () => {
        expect(() => buildShowRegistry(sourceOf(folder('x'), folder('x')))).toThrow(SchemaError);
        expect(() => buildShowRegistry(sourceOf(folder('bad', { fileTime: '9am' })))).toThrow(
            'src/shows/bad/show.json: fileTime must be HHMM',
        );
    });

    it('is empty for an empty source', () => {
        expect(buildShowRegistry(sourceOf()).shows).toEqual([]);
    });
});

describe('airsWeekly', () => {
    it('is true only for shows that air one day a week', () => {
        const { findShow } = buildShowRegistry(
            sourceOf(folder('daily'), folder('sat', { airDays: [6] })),
        );
        expect(airsWeekly(findShow('sat') as ShowConfig)).toBe(true);
        expect(airsWeekly(findShow('daily') as ShowConfig)).toBe(false);
    });
});
