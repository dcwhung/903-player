import type { CatalogBanner } from '@903-player/catalog';
import { fireEvent, render, screen } from '@testing-library/react';
import { activeBanner } from '../../../../catalog/runtime';
import { CATALOG_IMAGE_CROSS_ORIGIN } from '../../../../config/catalogImage';
import { t } from '../../../../i18n/t';
import { HomeBanner } from './HomeBanner';
import { resetBannerFallback } from '../HomeLandscapeGrid/useBannerImages';

vi.mock('../../../../catalog/runtime', () => ({ activeBanner: vi.fn() }));

const CATALOG_BANNER: CatalogBanner = {
    standard: 'https://api.example/catalog/v1/img/0123456789abcdef.webp',
    long: 'https://api.example/catalog/v1/img/fedcba9876543210.webp',
};

const bannerImage = () => screen.getByRole('img', { name: t('home.bannerAlt') });

describe('HomeBanner images (Phase 4 L3)', () => {
    beforeEach(() => resetBannerFallback());

    describe('with a catalog banner', () => {
        beforeEach(() => vi.mocked(activeBanner).mockReturnValue(CATALOG_BANNER));

        it('should show the catalog images in the default <picture>, loaded with CORS', () => {
            const { container } = render(<HomeBanner />);
            expect(bannerImage().getAttribute('src')).toBe(CATALOG_BANNER.standard);
            expect(bannerImage().getAttribute('crossorigin')).toBe(CATALOG_IMAGE_CROSS_ORIGIN);
            const source = container.querySelector('source');
            expect(source?.getAttribute('srcset')).toBe(CATALOG_BANNER.long);
        });

        it('should fall back to both built-in images when a catalog image fails (S-929)', () => {
            const { container } = render(<HomeBanner />);
            fireEvent.error(bannerImage());
            expect(bannerImage().getAttribute('src')).toMatch(/banner\.webp$/);
            const source = container.querySelector('source');
            expect(source?.getAttribute('srcset')).toMatch(/banner-wide\.webp$/);
        });
    });

    describe('without a catalog banner', () => {
        beforeEach(() => vi.mocked(activeBanner).mockReturnValue(undefined));

        it('should show the built-in images', () => {
            const { container } = render(<HomeBanner />);
            expect(bannerImage().getAttribute('src')).toMatch(/banner\.webp$/);
            const source = container.querySelector('source');
            expect(source?.getAttribute('srcset')).toMatch(/banner-wide\.webp$/);
        });
    });
});
