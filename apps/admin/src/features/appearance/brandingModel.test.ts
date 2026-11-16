import {
    BUILT_IN_ICON_BACKGROUND,
    BUILT_IN_TEXT,
    canSave,
    charCount,
    draftOf,
    homeName,
    iconSourceRequest,
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

    describe('iconSourceRequest', () => {
        const ICON = {
            favicon: 'a.png',
            appleTouch: 'b.png',
            icon192: 'c.png',
            icon512: 'd.png',
            maskable: 'e.png',
            maskableBackground: '#123456',
        };
        const BOXES = {
            ios: { x: 1, y: 2, width: 30, height: 30 },
            android: { x: 3, y: 4, width: 40, height: 40 },
            tab: { x: 5, y: 6, width: 50, height: 50 },
        };

        it('should open the built-in original with the built-in mask colour, to be uploaded', () => {
            const request = iconSourceRequest(null, 'ios');
            expect(request.url).toMatch(/app-icon.*\.png$/);
            expect(request.name).toBe('app-icon.png');
            expect(request.seed).toEqual({ device: 'ios', background: BUILT_IN_ICON_BACKGROUND });
        });

        it('should open the stored original with its boxes and keep its name', () => {
            const icon = { ...ICON, source: { image: 'f.jpg', same: false, boxes: BOXES } };
            expect(iconSourceRequest(icon, 'android')).toEqual({
                url: '/catalog/v1/img/f.jpg',
                name: 'f.jpg',
                seed: {
                    device: 'android',
                    storedName: 'f.jpg',
                    boxes: BOXES,
                    same: false,
                    background: '#123456',
                },
            });
        });

        it('should fall back to the 512 icon for an icon saved without an original', () => {
            expect(iconSourceRequest(ICON, 'ios')).toEqual({
                url: '/catalog/v1/img/d.png',
                name: 'd.png',
                seed: { device: 'ios', storedName: 'd.png', background: '#123456', fallback: true },
            });
        });
    });
});
