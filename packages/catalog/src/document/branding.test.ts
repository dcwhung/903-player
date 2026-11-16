import {
    BRANDING_DESCRIPTION_MAX_LENGTH,
    BRANDING_NAME_MAX_LENGTH,
    BRANDING_SHORT_NAME_MAX_LENGTH,
    parseCatalogText,
} from './branding';
import { CatalogDocumentError, parseCatalogDocument } from './document';

type Json = Record<string, unknown>;

const ENTRY: Json = { id: 'golden', definition: { name: 'x' }, images: {} };

const documentWith = (branding: unknown): Json => ({
    schemaVersion: 1,
    generatedAt: '2026-11-13T10:00:00Z',
    shows: [ENTRY],
    dramas: [ENTRY],
    branding,
});

const ICON = {
    favicon: 'https://cdn.example.com/img/0000000000000001.png',
    appleTouch: '/catalog/v1/img/0000000000000002.png',
    icon192: 'https://cdn.example.com/img/0000000000000003.png',
    icon512: 'https://cdn.example.com/img/0000000000000004.png',
    maskable: 'https://cdn.example.com/img/0000000000000005.png',
    maskableBackground: '#1a2B3c',
};

const TEXT = { name: '903 Player', shortName: '903', description: '叱咤 903 節目重溫' };

const parse = (branding: unknown) => parseCatalogDocument(documentWith(branding)).branding;

describe('parseCatalogDocument branding', () => {
    it('should leave branding out when the document has none', () => {
        const { branding: _omit, ...doc } = documentWith(undefined);
        void _omit;
        expect(parseCatalogDocument(doc)).not.toHaveProperty('branding');
    });

    it('should keep icon and text as they are', () => {
        expect(parse({ icon: ICON, text: TEXT })).toEqual({ icon: ICON, text: TEXT });
    });

    it('should accept icon only, text only, and text without shortName', () => {
        expect(parse({ icon: ICON })).toEqual({ icon: ICON });
        const { shortName: _short, ...noShort } = TEXT;
        void _short;
        expect(parse({ text: noShort })).toEqual({ text: noShort });
    });

    it.each<[string, unknown]>([
        ['a list', [ICON]],
        ['null', null],
        ['an unknown key', { icon: ICON, splash: ICON.icon512 }],
        ['an icon missing one image', { icon: { ...ICON, maskable: undefined } }],
        [
            'an icon without maskableBackground',
            { icon: { ...ICON, maskableBackground: undefined } },
        ],
        ['an icon with an unknown key', { icon: { ...ICON, ogIcon: ICON.icon512 } }],
        ['an icon http URL', { icon: { ...ICON, favicon: 'http://cdn.example.com/f.png' } }],
        ['an icon relative URL', { icon: { ...ICON, favicon: 'favicon.png' } }],
        ['a 3-digit background', { icon: { ...ICON, maskableBackground: '#abc' } }],
        ['a named background', { icon: { ...ICON, maskableBackground: 'black' } }],
        ['text with an unknown key', { text: { ...TEXT, title: 'x' } }],
        ['text without name', { text: { ...TEXT, name: undefined } }],
        ['text without description', { text: { ...TEXT, description: undefined } }],
        ['a blank name', { text: { ...TEXT, name: '   ' } }],
        ['a blank shortName', { text: { ...TEXT, shortName: ' ' } }],
        ['a blank description', { text: { ...TEXT, description: '' } }],
        ['a name that is not a string', { text: { ...TEXT, name: 903 } }],
    ])('should reject branding with %s', (_label, branding) => {
        expect(() => parse(branding)).toThrow(CatalogDocumentError);
    });

    it('should say where the problem is', () => {
        expect(() => parse({ icon: { ...ICON, icon192: 1 } })).toThrow(
            'catalog.json: branding.icon.icon192 must be an https URL or a same-origin absolute path',
        );
    });
});

describe('parseCatalogText length limits', () => {
    const atLimit = (length: number) => '字'.repeat(length);

    it.each<[keyof typeof TEXT, number]>([
        ['name', BRANDING_NAME_MAX_LENGTH],
        ['shortName', BRANDING_SHORT_NAME_MAX_LENGTH],
        ['description', BRANDING_DESCRIPTION_MAX_LENGTH],
    ])('should accept %s at %i characters and reject one more', (key, max) => {
        expect(parseCatalogText({ ...TEXT, [key]: atLimit(max) })[key]).toBe(atLimit(max));
        expect(() => parseCatalogText({ ...TEXT, [key]: atLimit(max + 1) })).toThrow(
            `branding.text.${key} must be 1–${max} characters`,
        );
    });

    it('should lock the limits named in the branding plan', () => {
        expect([
            BRANDING_NAME_MAX_LENGTH,
            BRANDING_SHORT_NAME_MAX_LENGTH,
            BRANDING_DESCRIPTION_MAX_LENGTH,
        ]).toEqual([40, 24, 200]);
    });

    it('should count characters by code point (emoji = 1)', () => {
        const name = '🎧'.repeat(BRANDING_NAME_MAX_LENGTH);
        expect(parseCatalogText({ ...TEXT, name }).name).toBe(name);
    });
});
