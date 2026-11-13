import { ASSET_DIMENSIONS, type CatalogBanner } from '@903-player/catalog';
import { activeBanner } from '../../../../catalog/runtime';
import { bannerImages } from './bannerImages';

vi.mock('../../../../catalog/runtime', () => ({ activeBanner: vi.fn() }));

const CATALOG_BANNER: CatalogBanner = {
    standard: 'https://api.example/catalog/v1/img/0123456789abcdef.webp',
    long: 'https://api.example/catalog/v1/img/fedcba9876543210.webp',
};

const { bannerStandard, bannerLong } = ASSET_DIMENSIONS;

describe('bannerImages (Phase 4 L3)', () => {
    it('should use the catalog banner, keeping the catalog asset sizes (S-925)', () => {
        vi.mocked(activeBanner).mockReturnValue(CATALOG_BANNER);
        expect(bannerImages()).toEqual({
            standard: { src: CATALOG_BANNER.standard, ...bannerStandard },
            long: { src: CATALOG_BANNER.long, ...bannerLong },
        });
    });

    it('should fall back to the built-in images without a catalog banner', () => {
        vi.mocked(activeBanner).mockReturnValue(undefined);
        const images = bannerImages();
        expect(images.standard).toMatchObject(bannerStandard);
        expect(images.standard.src).toMatch(/banner\.webp$/);
        expect(images.long).toMatchObject(bannerLong);
        expect(images.long.src).toMatch(/banner-wide\.webp$/);
    });

    it('should use the built-in images when asked, even with a catalog banner (S-929)', () => {
        vi.mocked(activeBanner).mockReturnValue(CATALOG_BANNER);
        const images = bannerImages({ builtIn: true });
        expect(images.standard.src).toMatch(/banner\.webp$/);
        expect(images.long.src).toMatch(/banner-wide\.webp$/);
        expect(images.standard).toMatchObject(bannerStandard);
    });
});
