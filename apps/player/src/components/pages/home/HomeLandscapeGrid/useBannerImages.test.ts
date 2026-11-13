import type { CatalogBanner } from '@903-player/catalog';
import { act, renderHook } from '@testing-library/react';
import { activeBanner } from '../../../../catalog/runtime';
import { resetBannerFallback, useBannerImages } from './useBannerImages';

vi.mock('../../../../catalog/runtime', () => ({ activeBanner: vi.fn() }));

const CATALOG_BANNER: CatalogBanner = {
    standard: 'https://api.example/catalog/v1/img/0123456789abcdef.webp',
    long: 'https://api.example/catalog/v1/img/fedcba9876543210.webp',
};

describe('useBannerImages (S-929)', () => {
    beforeEach(() => resetBannerFallback());

    it('should switch to the built-in images once a catalog banner image fails to load', () => {
        vi.mocked(activeBanner).mockReturnValue(CATALOG_BANNER);
        const { result } = renderHook(() => useBannerImages());
        expect(result.current.images.standard.src).toBe(CATALOG_BANNER.standard);
        act(() => result.current.onError?.());
        expect(result.current.images.standard.src).toMatch(/banner\.webp$/);
        expect(result.current.images.long.src).toMatch(/banner-wide\.webp$/);
    });

    it('should stop handling errors after falling back (no retry loop)', () => {
        vi.mocked(activeBanner).mockReturnValue(CATALOG_BANNER);
        const { result } = renderHook(() => useBannerImages());
        act(() => result.current.onError?.());
        expect(result.current.onError).toBeUndefined();
    });

    it('should not handle errors of the built-in images (nothing to fall back to)', () => {
        vi.mocked(activeBanner).mockReturnValue(undefined);
        const { result } = renderHook(() => useBannerImages());
        expect(result.current.onError).toBeUndefined();
    });

    it('should remember the failure for components mounted later, e.g. after rotating (S-955)', () => {
        vi.mocked(activeBanner).mockReturnValue(CATALOG_BANNER);
        const first = renderHook(() => useBannerImages());
        act(() => first.result.current.onError?.());
        first.unmount();
        const { result } = renderHook(() => useBannerImages());
        expect(result.current.images.standard.src).toMatch(/banner\.webp$/);
        expect(result.current.onError).toBeUndefined();
    });
});
