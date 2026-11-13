import { ICON_OUTPUTS, boxesFor, cropView, isSmallIconSource, safeRect } from './iconModel';

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

    it('should put the maskable safe zone in the middle 80%', () => {
        expect(safeRect({ width: 500, height: 500 })).toEqual({
            x: 50,
            y: 50,
            width: 400,
            height: 400,
        });
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
});
