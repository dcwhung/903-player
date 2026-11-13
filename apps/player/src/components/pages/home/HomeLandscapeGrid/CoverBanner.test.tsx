import type { CatalogBanner } from '@903-player/catalog';
import { fireEvent, render, screen } from '@testing-library/react';
import { activeBanner } from '../../../../catalog/runtime';
import { CATALOG_IMAGE_CROSS_ORIGIN } from '../../../../config/catalogImage';
import { t } from '../../../../i18n/t';
import { CoverBanner } from './CoverBanner';

vi.mock('../../../../catalog/runtime', () => ({ activeBanner: vi.fn() }));

const CATALOG_BANNER: CatalogBanner = {
    standard: 'https://api.example/catalog/v1/img/0123456789abcdef.webp',
    long: 'https://api.example/catalog/v1/img/fedcba9876543210.webp',
};

const bannerImage = () => screen.getByRole('img', { name: t('home.bannerAlt') });

describe('CoverBanner (Phase 4 L3)', () => {
    it('should fill the wide-landscape cell with the catalog standard image, loaded with CORS', () => {
        vi.mocked(activeBanner).mockReturnValue(CATALOG_BANNER);
        render(<CoverBanner />);
        expect(bannerImage().getAttribute('src')).toBe(CATALOG_BANNER.standard);
        expect(bannerImage().getAttribute('crossorigin')).toBe(CATALOG_IMAGE_CROSS_ORIGIN);
    });

    it('should fall back to the built-in standard image when the catalog image fails (S-929)', () => {
        vi.mocked(activeBanner).mockReturnValue(CATALOG_BANNER);
        render(<CoverBanner />);
        fireEvent.error(bannerImage());
        expect(bannerImage().getAttribute('src')).toMatch(/banner\.webp$/);
    });

    it('should use the built-in standard image without a catalog banner', () => {
        vi.mocked(activeBanner).mockReturnValue(undefined);
        render(<CoverBanner />);
        expect(bannerImage().getAttribute('src')).toMatch(/banner\.webp$/);
    });
});
