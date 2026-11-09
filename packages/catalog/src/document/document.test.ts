import { buildRegistry } from '../dramas/registry';
import { buildShowRegistry } from '../shows/registry';
import {
    CATALOG_SCHEMA_VERSION,
    CatalogDocumentError,
    documentSource,
    parseCatalogDocument,
} from './document';

type Json = Record<string, unknown>;

const THEME: Json = {
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

const SHOW_DEFINITION: Json = {
    name: 'Bad Girl大過佬',
    fileTime: '1009',
    airDays: [1, 2, 3, 4, 5],
    tile: 'tile.webp',
    disc: 'disc.webp',
    theme: THEME,
};

const DRAMA_DEFINITION: Json = {
    name: '黃金少年',
    kind: 'series',
    enabled: true,
    tile: 'tile.webp',
    disc: 'disc.webp',
    audio: { host: 'r2', folder: '黃金少年', file: '{no2}.m4a' },
    theme: THEME,
    arcs: [{ id: 'season-1', name: 'Season 1', addedAt: '2026-10-24', episodes: 2 }],
};

/** document 測試唔理錄音 URL */
const OPTIONS = { appAudioBase: '/dramas/' };

const IMAGES = {
    'tile.webp': 'https://cdn.example.com/catalog/tile.webp',
    'disc.webp': '/903-player/catalog/disc.webp',
};

const validDocument = (): Json => ({
    schemaVersion: 1,
    generatedAt: '2026-11-07T10:00:00Z',
    shows: [{ id: 'badgirl', definition: SHOW_DEFINITION, images: IMAGES }],
    dramas: [{ id: 'golden', definition: DRAMA_DEFINITION, images: IMAGES }],
});

/** validDocument + 一個改動（path 用 . 分隔；value undefined = 刪走個 key） */
const withChange = (path: string, value: unknown): Json => {
    const result = JSON.parse(JSON.stringify(validDocument())) as Json;
    const keys = path.split('.');
    const last = keys.pop() ?? '';
    const parent = keys.reduce<Json>((node, key) => node[key] as Json, result);
    if (value === undefined) delete parent[last];
    else parent[last] = value;
    return result;
};

describe('parseCatalogDocument', () => {
    it('should accept a valid v1 document', () => {
        const doc = parseCatalogDocument(validDocument());
        expect(doc.schemaVersion).toBe(CATALOG_SCHEMA_VERSION);
        expect(doc.dramas[0]?.id).toBe('golden');
        expect(doc.shows[0]?.images).toEqual(IMAGES);
    });

    it('should ignore unknown top-level keys (for example a later banner)', () => {
        expect(() => parseCatalogDocument(withChange('banner', { text: 'x' }))).not.toThrow();
    });

    it.each([
        ['not an object', null],
        ['an array', []],
        ['a string', '{}'],
    ])('should reject a document that is %s', (_label, value) => {
        expect(() => parseCatalogDocument(value)).toThrow(CatalogDocumentError);
    });

    it.each<[string, string, unknown]>([
        ['an unknown schemaVersion', 'schemaVersion', 2],
        ['a string schemaVersion', 'schemaVersion', '1'],
        ['no schemaVersion', 'schemaVersion', undefined],
        ['no generatedAt', 'generatedAt', undefined],
        ['generatedAt without a time zone', 'generatedAt', '2026-11-07T10:00:00'],
        ['generatedAt that is not a date', 'generatedAt', 'yesterday'],
        ['generatedAt on a day that does not exist', 'generatedAt', '2026-02-30T10:00:00Z'],
        ['no shows', 'shows', undefined],
        ['empty shows', 'shows', []],
        ['empty dramas', 'dramas', []],
        ['dramas that is not a list', 'dramas', { golden: {} }],
        ['an entry that is not an object', 'dramas.0', 'golden'],
        ['an entry without id', 'dramas.0.id', undefined],
        ['an id that is not kebab-case', 'dramas.0.id', 'Golden_Boy'],
        ['a definition that is not an object', 'dramas.0.definition', []],
        ['no definition', 'shows.0.definition', undefined],
        ['no images', 'shows.0.images', undefined],
        ['images that is a list', 'shows.0.images', ['tile.webp']],
        ['an image URL that is not a string', 'shows.0.images', { ...IMAGES, 'tile.webp': 1 }],
    ])('should reject %s', (_label, path, value) => {
        expect(() => parseCatalogDocument(withChange(path, value))).toThrow(CatalogDocumentError);
    });

    it('should reject duplicate ids within one list', () => {
        const doc = validDocument();
        const dramas = doc.dramas as Json[];
        doc.dramas = [...dramas, ...dramas];
        expect(() => parseCatalogDocument(doc)).toThrow(/duplicate/);
    });

    it('should allow the same id in shows and dramas', () => {
        const doc = withChange('shows.0.id', 'golden');
        expect(() => parseCatalogDocument(doc)).not.toThrow();
    });

    it.each([
        ['http (not https)', 'http://cdn.example.com/tile.webp'],
        ['protocol-relative', '//cdn.example.com/tile.webp'],
        ['relative to the page', 'tile.webp'],
        ['a data URL', 'data:image/webp;base64,AAAA'],
        ['javascript', 'javascript:alert(1)'],
        ['an empty string', ''],
        ['https without a host', 'https://'],
    ])('should reject an image URL that is %s', (_label, url) => {
        const doc = withChange('dramas.0.images', { ...IMAGES, 'tile.webp': url });
        expect(() => parseCatalogDocument(doc)).toThrow(CatalogDocumentError);
    });

    it.each([
        ['absolute', '/tile.webp'],
        ['with a parent step', '../tile.webp'],
        ['empty', ''],
        ['with a backslash', 'arcs\\tile.webp'],
    ])('should reject an image file name that is %s', (_label, file) => {
        const doc = withChange('dramas.0.images', { ...IMAGES, [file]: IMAGES['tile.webp'] });
        expect(() => parseCatalogDocument(doc)).toThrow(CatalogDocumentError);
    });

    it('should accept image file names in sub-folders (arc art)', () => {
        const images = { ...IMAGES, 'arcs/season-1/disc.webp': IMAGES['tile.webp'] };
        expect(() => parseCatalogDocument(withChange('dramas.0.images', images))).not.toThrow();
    });

    it('should say where the problem is', () => {
        expect(() => parseCatalogDocument(withChange('dramas.0.id', 'Bad'))).toThrow(
            /catalog\.json: dramas\[0\]\.id/,
        );
    });
});

describe('documentSource', () => {
    it('should give one folder per entry, keeping definition and image URLs as they are', () => {
        const doc = parseCatalogDocument(validDocument());
        expect(documentSource(doc, 'dramas').folders()).toEqual([
            {
                id: 'golden',
                source: 'catalog.json: dramas/golden',
                definition: DRAMA_DEFINITION,
                images: IMAGES,
            },
        ]);
    });

    it('should build registries that use the absolute image URLs', () => {
        const doc = parseCatalogDocument(validDocument());
        const dramas = buildRegistry(documentSource(doc, 'dramas'), OPTIONS);
        const shows = buildShowRegistry(documentSource(doc, 'shows'));
        expect(dramas.findDrama('golden')?.tileArt).toBe(IMAGES['tile.webp']);
        expect(shows.findShow('badgirl')?.theme.art).toBe(IMAGES['disc.webp']);
    });

    it('should make the registry build fail when a definition names an image not in the manifest', () => {
        const doc = parseCatalogDocument(withChange('dramas.0.images', { 'tile.webp': '/t.webp' }));
        expect(() => buildRegistry(documentSource(doc, 'dramas'), OPTIONS)).toThrow(/disc\.webp/);
    });
});
