import type { CatalogBanner } from '@903-player/catalog';
import { render, screen } from '@testing-library/react';
import { activeBanner } from '../../../../catalog/runtime';
import { CATALOG_IMAGE_CROSS_ORIGIN } from '../../../../config/catalogImage';
import { t } from '../../../../i18n/t';
import { CoverBanner } from '../HomeLandscapeGrid/CoverBanner';
import { FittedBanner } from '../HomeLandscapeGrid/FittedBanner';
import { HomeBanner } from './HomeBanner';

vi.mock('../../../../catalog/runtime', () => ({ activeBanner: vi.fn() }));

const CATALOG_BANNER: CatalogBanner = {
    standard: 'https://api.example/catalog/v1/img/0123456789abcdef.webp',
    long: 'https://api.example/catalog/v1/img/fedcba9876543210.webp',
};

const bannerImage = () => screen.getByRole('img', { name: t('home.bannerAlt') });

describe('home banner images (Phase 4 L3)', () => {
    describe('with a catalog banner', () => {
        beforeEach(() => vi.mocked(activeBanner).mockReturnValue(CATALOG_BANNER));

        it('should show the catalog images in the default <picture>, loaded with CORS', () => {
            const { container } = render(<HomeBanner />);
            expect(bannerImage().getAttribute('src')).toBe(CATALOG_BANNER.standard);
            expect(bannerImage().getAttribute('crossorigin')).toBe(CATALOG_IMAGE_CROSS_ORIGIN);
            const source = container.querySelector('source');
            expect(source?.getAttribute('srcset')).toBe(CATALOG_BANNER.long);
        });

        it('should fill the wide-landscape cell with the catalog standard image', () => {
            render(<CoverBanner />);
            expect(bannerImage().getAttribute('src')).toBe(CATALOG_BANNER.standard);
            expect(bannerImage().getAttribute('crossorigin')).toBe(CATALOG_IMAGE_CROSS_ORIGIN);
        });

        it('should fit the catalog image into the phone-landscape cell', () => {
            render(<FittedBanner count={8} miniPlayer={false} />);
            expect(Object.values(CATALOG_BANNER)).toContain(bannerImage().getAttribute('src'));
            expect(bannerImage().getAttribute('crossorigin')).toBe(CATALOG_IMAGE_CROSS_ORIGIN);
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

        it('should use the built-in standard image in the wide-landscape cell', () => {
            render(<CoverBanner />);
            expect(bannerImage().getAttribute('src')).toMatch(/banner\.webp$/);
        });
    });
});
