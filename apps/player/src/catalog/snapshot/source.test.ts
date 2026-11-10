import { buildShowRegistry, foldersFromGlobs, type FolderSource } from '@903-player/catalog';
import { loadSnapshot, preferSnapshot, snapshotDocument } from './source';

const TILE = '0123456789abcdef.webp';
const DISC = 'fedcba9876543210.webp';

const THEME = {
    bg: '#f7e7b4',
    surface: '#fdf3d3',
    track: '#e8c869',
    accent: '#f2c21b',
    onAccent: '#3a2600',
    title: '#7f5500',
    text: '#3b2a0e',
    muted: '#6b5121',
    shadowDark: '#e0c77e',
    shadowLight: '#fff8e2',
};

/** 細 fixture snapshot（plugin 寫落 data/catalog.json 嘅格式：images 值係檔名） */
const SNAPSHOT_JSON = {
    schemaVersion: 1,
    generatedAt: '2026-11-10T00:00:00.000Z',
    shows: [
        {
            id: 'snapshot-show',
            definition: {
                name: 'Snapshot Show',
                fileTime: '1009',
                airDays: [1, 2, 3, 4, 5],
                tile: 'tile.webp',
                disc: 'disc.webp',
                theme: THEME,
            },
            images: { 'tile.webp': TILE, 'disc.webp': DISC },
        },
    ],
    dramas: [{ id: 'snapshot-drama', definition: { name: 'x' }, images: { 'tile.webp': TILE } }],
};

/** import.meta.glob 嘅 key 格式（相對 source.ts） */
const DOCUMENTS = { './data/catalog.json': SNAPSHOT_JSON };
const IMAGES = {
    [`./data/img/${TILE}`]: `/903-player/assets/${TILE}`,
    [`./data/img/${DISC}`]: `/903-player/assets/${DISC}`,
};

const LIBRARY: FolderSource = foldersFromGlobs({}, {}, 'library');

describe('loadSnapshot', () => {
    it('should answer undefined when no snapshot was fetched at build time', () => {
        expect(loadSnapshot({}, {})).toBeUndefined();
    });

    it('should parse the snapshot with its images pointing at the bundled URLs', () => {
        const doc = loadSnapshot(DOCUMENTS, IMAGES);
        expect(doc?.shows[0]?.images).toEqual({
            'tile.webp': `/903-player/assets/${TILE}`,
            'disc.webp': `/903-player/assets/${DISC}`,
        });
        expect(doc?.dramas.map((d) => d.id)).toEqual(['snapshot-drama']);
    });

    it('should warn and answer undefined when an image is missing or the document is broken', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(loadSnapshot(DOCUMENTS, { [`./data/img/${TILE}`]: '/a.webp' })).toBeUndefined();
        expect(
            loadSnapshot({ './data/catalog.json': { schemaVersion: 2 } }, IMAGES),
        ).toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(2);
        warn.mockRestore();
    });
});

describe('preferSnapshot', () => {
    it('should use the snapshot kind when there is a snapshot', () => {
        const source = preferSnapshot(loadSnapshot(DOCUMENTS, IMAGES), 'shows', LIBRARY);
        const registry = buildShowRegistry(source);
        expect(registry.shows.map((s) => s.id)).toEqual(['snapshot-show']);
        expect(registry.shows[0]?.tileArt).toBe(`/903-player/assets/${TILE}`);
    });

    it('should fall back to the repo library without a snapshot', () => {
        expect(preferSnapshot(undefined, 'dramas', LIBRARY)).toBe(LIBRARY);
    });
});

describe('snapshotDocument', () => {
    it('should stay off in unit tests, so library tests keep testing the library', () => {
        expect(snapshotDocument).toBeUndefined();
    });
});
