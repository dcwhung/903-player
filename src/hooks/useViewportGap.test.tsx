import { act, renderHook } from '@testing-library/react';
import { useViewportGap } from './useViewportGap';

const gapVar = () => document.documentElement.style.getPropertyValue('--viewport-gap-bottom');

const stubDevice = (standalone: boolean, innerHeight: number) => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            matches: query.includes('standalone') ? standalone : query.includes('portrait'),
        })),
    );
    vi.spyOn(window.screen, 'height', 'get').mockReturnValue(852);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(innerHeight);
};

describe('useViewportGap', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('publishes the gap below a short standalone viewport and clears it on unmount', () => {
        stubDevice(true, 797);
        const { unmount } = renderHook(() => useViewportGap());

        expect(gapVar()).toBe('55px');
        unmount();
        expect(gapVar()).toBe('');
    });

    it('follows the viewport when it resizes', () => {
        stubDevice(true, 797);
        renderHook(() => useViewportGap());

        vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(852);
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });

        expect(gapVar()).toBe('0px');
    });

    it('stays at zero in a normal browser tab', () => {
        stubDevice(false, 700);
        renderHook(() => useViewportGap());

        expect(gapVar()).toBe('0px');
    });
});
