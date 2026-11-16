import {
    BUILT_IN_TEXT,
    canSave,
    charCount,
    draftOf,
    homeName,
    iconUrls,
    isDirty,
    nameChanged,
    textBody,
} from './brandingModel';

const SAVED = draftOf(null);

describe('brandingModel', () => {
    it('should start from the built-in text, or the saved text with an empty short name', () => {
        expect(SAVED).toEqual(BUILT_IN_TEXT);
        expect(draftOf({ name: 'A', shortName: null, description: 'B' })).toEqual({
            name: 'A',
            shortName: '',
            description: 'B',
        });
    });

    it('should only allow saving a real change with a name and a description', () => {
        expect(canSave({ ...SAVED, name: ` ${SAVED.name} ` }, SAVED)).toBe(false);
        expect(isDirty({ ...SAVED, shortName: '903' }, SAVED)).toBe(true);
        expect(canSave({ ...SAVED, shortName: '903' }, SAVED)).toBe(true);
        expect(canSave({ ...SAVED, name: '  ' }, SAVED)).toBe(false);
        expect(canSave({ ...SAVED, description: '' }, SAVED)).toBe(false);
    });

    it('should ask before renaming the app only when the name changes', () => {
        expect(nameChanged({ ...SAVED, description: 'x' }, SAVED)).toBe(false);
        expect(nameChanged({ ...SAVED, name: '叱咤' }, SAVED)).toBe(true);
    });

    it('should trim the body and send an empty short name as null', () => {
        expect(textBody({ name: ' A ', shortName: '  ', description: ' B ' })).toEqual({
            name: 'A',
            shortName: null,
            description: 'B',
        });
    });

    it('should show the short name on the home screen, falling back to the app name', () => {
        expect(homeName({ ...SAVED, shortName: '' })).toBe(SAVED.name);
        expect(homeName(SAVED)).toBe('903 Player');
    });

    it('should count characters, not UTF-16 units', () => {
        expect(charCount('叱咤🎵')).toBe(3);
    });

    it('should preview R2 icons when custom and the built-in icons otherwise', () => {
        const icon = {
            favicon: 'a.png',
            appleTouch: 'b.png',
            icon192: 'c.png',
            icon512: 'd.png',
            maskable: 'e.png',
            maskableBackground: '#000000',
        };
        expect(iconUrls(icon)).toEqual({
            source: '/catalog/v1/img/d.png',
            appleTouch: '/catalog/v1/img/b.png',
            maskable: '/catalog/v1/img/e.png',
            favicon: '/catalog/v1/img/a.png',
        });
        expect(iconUrls(null).appleTouch).toBe('/apple-touch-icon.png');
    });
});
