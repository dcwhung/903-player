import type { CatalogBanner } from '@903-player/catalog';
import { fireEvent, render, screen } from '@testing-library/react';
import { activeBanner } from '../../../../catalog/runtime';
import { CATALOG_IMAGE_CROSS_ORIGIN } from '../../../../config/catalogImage';
import { t } from '../../../../i18n/t';
import { bannerImages } from './bannerImages';
import { bannerRule } from './bannerRules';
import { FittedBanner } from './FittedBanner';
import { resetBannerFallback } from './useBannerImages';

vi.mock('../../../../catalog/runtime', () => ({ activeBanner: vi.fn() }));

const CATALOG_BANNER: CatalogBanner = {
    standard: 'https://api.example/catalog/v1/img/0123456789abcdef.webp',
    long: 'https://api.example/catalog/v1/img/fedcba9876543210.webp',
};

/** 8 張卡、冇 mini player：規則表有列，唔使量格（jsdom 冇 ResizeObserver → NaN） */
const COUNT = 8;
const MINI_PLAYER = false;
const UNMEASURED = Number.NaN;

const bannerImage = () => screen.getByRole('img', { name: t('home.bannerAlt') });

describe('FittedBanner (Phase 4 L3)', () => {
    beforeEach(() => resetBannerFallback());

    it('should fit the catalog image picked by bannerRule, loaded with CORS (S-926)', () => {
        vi.mocked(activeBanner).mockReturnValue(CATALOG_BANNER);
        const { image } = bannerRule(COUNT, MINI_PLAYER, UNMEASURED);
        render(<FittedBanner count={COUNT} miniPlayer={MINI_PLAYER} />);
        expect(bannerImage().getAttribute('src')).toBe(CATALOG_BANNER[image]);
        expect(bannerImage().getAttribute('crossorigin')).toBe(CATALOG_IMAGE_CROSS_ORIGIN);
    });

    it('should fall back to the built-in image when the catalog image fails (S-929)', () => {
        vi.mocked(activeBanner).mockReturnValue(CATALOG_BANNER);
        const { image } = bannerRule(COUNT, MINI_PLAYER, UNMEASURED);
        render(<FittedBanner count={COUNT} miniPlayer={MINI_PLAYER} />);
        fireEvent.error(bannerImage());
        expect(bannerImage().getAttribute('src')).toBe(bannerImages({ builtIn: true })[image].src);
        expect(bannerImage().getAttribute('src')).not.toBe(CATALOG_BANNER[image]);
    });
});
