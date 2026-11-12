import type { CatalogBanner } from '@903-player/catalog';
import { activeBanner } from '../../../../catalog/runtime';
import { bannerImages } from './bannerImages';

vi.mock('../../../../catalog/runtime', () => ({ activeBanner: vi.fn() }));

const CATALOG_BANNER: CatalogBanner = {
    standard: 'https://api.example/catalog/v1/img/0123456789abcdef.webp',
    long: 'https://api.example/catalog/v1/img/fedcba9876543210.webp',
};

describe('bannerImages (Phase 4 L3)', () => {
    it('should use the catalog banner, keeping the locked sizes', () => {
        vi.mocked(activeBanner).mockReturnValue(CATALOG_BANNER);
        expect(bannerImages()).toEqual({
            standard: { src: CATALOG_BANNER.standard, width: 1200, height: 517 },
            long: { src: CATALOG_BANNER.long, width: 2000, height: 400 },
        });
    });

    it('should fall back to the built-in images without a catalog banner', () => {
        vi.mocked(activeBanner).mockReturnValue(undefined);
        const images = bannerImages();
        expect(images.standard).toMatchObject({ width: 1200, height: 517 });
        expect(images.standard.src).toMatch(/banner\.webp$/);
        expect(images.long).toMatchObject({ width: 2000, height: 400 });
        expect(images.long.src).toMatch(/banner-wide\.webp$/);
    });
});
