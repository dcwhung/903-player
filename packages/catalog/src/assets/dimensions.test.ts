import { ASSET_DIMENSIONS, ASSET_MAX_BYTES } from './dimensions';

describe('ASSET_DIMENSIONS', () => {
    it('should lock the slot sizes (user decision 2026-11-10 / Phase 4 plan / branding plan)', () => {
        expect(ASSET_DIMENSIONS).toEqual({
            disc: { width: 600, height: 600 },
            tile: { width: 1216, height: 684 },
            bannerStandard: { width: 1200, height: 517 },
            bannerLong: { width: 2000, height: 400 },
            iconFavicon: { width: 64, height: 64 },
            iconAppleTouch: { width: 180, height: 180 },
            icon192: { width: 192, height: 192 },
            icon512: { width: 512, height: 512 },
            iconMaskable: { width: 512, height: 512 },
        });
    });

    it('should be frozen so no consumer can change a shared size', () => {
        expect(Object.isFrozen(ASSET_DIMENSIONS)).toBe(true);
        Object.values(ASSET_DIMENSIONS).forEach((size) => expect(Object.isFrozen(size)).toBe(true));
    });
});

describe('ASSET_MAX_BYTES', () => {
    it('should be 1 MiB', () => {
        expect(ASSET_MAX_BYTES).toBe(1024 * 1024);
    });
});
