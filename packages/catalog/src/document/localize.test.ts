import { CATALOG_SCHEMA_VERSION, CatalogDocumentError, type CatalogDocument } from './document';
import { localizeDocument } from './localize';

const TILE = '0123456789abcdef.webp';
const DISC = 'fedcba9876543210.webp';

/** snapshot 寫落 repo 嘅格式：images 值係檔名（唔係 URL） */
const snapshot = (): CatalogDocument => ({
    schemaVersion: CATALOG_SCHEMA_VERSION,
    generatedAt: '2026-11-10T00:00:00.000Z',
    shows: [{ id: 'badgirl', definition: { name: 'x' }, images: { 'tile.webp': TILE } }],
    dramas: [
        {
            id: 'golden',
            definition: { name: 'y' },
            images: { 'tile.webp': TILE, 'arcs/season-1/disc.webp': DISC },
        },
    ],
});

const URLS = {
    [TILE]: '/903-player/assets/0123456789abcdef-AbC.webp',
    [DISC]: '/903-player/assets/fedcba9876543210-XyZ.webp',
};

describe('localizeDocument', () => {
    it('should swap every image file name for its bundled URL in both kinds', () => {
        const doc = localizeDocument(snapshot(), URLS);
        expect(doc.shows[0]?.images).toEqual({ 'tile.webp': URLS[TILE] });
        expect(doc.dramas[0]?.images).toEqual({
            'tile.webp': URLS[TILE],
            'arcs/season-1/disc.webp': URLS[DISC],
        });
    });

    it('should keep everything else and leave the input untouched', () => {
        const input = snapshot();
        const doc = localizeDocument(input, URLS);
        expect(doc.generatedAt).toBe(input.generatedAt);
        expect(doc.dramas[0]?.definition).toBe(input.dramas[0]?.definition);
        expect(input.shows[0]?.images).toEqual({ 'tile.webp': TILE });
    });

    it('should throw when an image was not bundled', () => {
        expect(() => localizeDocument(snapshot(), { [TILE]: URLS[TILE] })).toThrow(
            CatalogDocumentError,
        );
        expect(() => localizeDocument(snapshot(), { [TILE]: URLS[TILE] })).toThrow(DISC);
    });
});
