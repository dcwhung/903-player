import {
    ICON_OUTPUTS,
    boxesFor,
    cropView,
    initialCrop,
    isSmallIconSource,
    withSwatch,
} from './iconModel';

const SHARED = { x: 0, y: 0, width: 100, height: 100 };
const OWN = { x: 10, y: 10, width: 50, height: 50 };

describe('iconModel', () => {
    it('should output favicon 64, apple-touch 180, 192, 512 and maskable 512', () => {
        expect(ICON_OUTPUTS.map(({ key, size }) => `${key} ${size.width}x${size.height}`)).toEqual([
            'favicon 64x64',
            'appleTouch 180x180',
            'icon192 192x192',
            'icon512 512x512',
            'maskable 512x512',
        ]);
        expect(ICON_OUTPUTS.filter((output) => output.maskable).map(({ key }) => key)).toEqual([
            'maskable',
        ]);
    });

    it('should warn when the source is smaller than 512 on either side', () => {
        expect(isSmallIconSource({ width: 511, height: 2000 })).toBe(true);
        expect(isSmallIconSource({ width: 512, height: 512 })).toBe(false);
    });

    it('should use one box for every device unless each device has its own', () => {
        expect(boxesFor(true, SHARED, { ios: OWN })).toEqual({
            ios: SHARED,
            android: SHARED,
            tab: SHARED,
        });
        expect(boxesFor(false, SHARED, { ios: OWN })).toEqual({
            ios: OWN,
            android: SHARED,
            tab: SHARED,
        });
    });

    it('should show the safe zone for the shared crop and round only Android', () => {
        expect(cropView(true, 'ios')).toMatchObject({ round: false, safe: true });
        expect(cropView(false, 'android')).toMatchObject({ round: true, safe: true });
        expect(cropView(false, 'ios')).toMatchObject({ round: false, safe: false });
        expect(cropView(false, 'tab').out).toBe('appearance.icon.outTab');
    });

    describe('initialCrop', () => {
        const STORED = { ios: OWN, android: { x: 5, y: 5, width: 80, height: 80 }, tab: SHARED };

        it('should start with one shared box from the default crop for a new file', () => {
            expect(initialCrop(SHARED, {})).toEqual({
                same: true,
                device: 'ios',
                shared: SHARED,
                own: {},
            });
        });

        it('should open the clicked device on its own, keeping every stored box', () => {
            expect(initialCrop(SHARED, { boxes: STORED, same: true, device: 'android' })).toEqual({
                same: false,
                device: 'android',
                shared: STORED.android,
                own: STORED,
            });
        });

        it('should keep the stored shared crop when no device is chosen', () => {
            expect(initialCrop(SHARED, { boxes: STORED, same: true })).toMatchObject({
                same: true,
                shared: STORED.ios,
            });
        });

        it('should open the clicked device from the default crop when nothing is stored', () => {
            expect(initialCrop(SHARED, { device: 'ios' })).toEqual({
                same: false,
                device: 'ios',
                shared: SHARED,
                own: {},
            });
        });
    });

    it('should add the stored mask colour to the swatches when it is not there', () => {
        expect(withSwatch(['#000000', '#ffffff'], '#98bdde')).toEqual([
            '#98bdde',
            '#000000',
            '#ffffff',
        ]);
        expect(withSwatch(['#000000', '#ffffff'], '#000000')).toEqual(['#000000', '#ffffff']);
        expect(withSwatch(['#000000'], undefined)).toEqual(['#000000']);
    });
});
