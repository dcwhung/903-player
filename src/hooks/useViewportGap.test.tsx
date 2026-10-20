import { act, renderHook } from '@testing-library/react';
import { useViewportGap } from './useViewportGap';

const gapVar = () => document.documentElement.style.getPropertyValue('--viewport-gap-bottom');

/** iOS 主畫面 app 先有 navigator.standalone；直向與否由 matchMedia 答 */
const stubDevice = ({ standalone = true, portrait = true, innerHeight = 797 } = {}) => {
    Object.defineProperty(navigator, 'standalone', { value: standalone, configurable: true });
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({ matches: query.includes('portrait') ? portrait : false })),
    );
    vi.spyOn(window.screen, 'height', 'get').mockReturnValue(852);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(innerHeight);
};

const setInnerHeight = (value: number) =>
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(value);

describe('useViewportGap', () => {
    afterEach(() => {
        Reflect.deleteProperty(navigator, 'standalone');
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('publishes the gap below a short iOS standalone viewport and clears it on unmount', () => {
        stubDevice();
        const { unmount } = renderHook(() => useViewportGap());

        expect(gapVar()).toBe('55px');
        unmount();
        expect(gapVar()).toBe('');
    });

    it.each(['resize', 'orientationchange', 'pageshow'])('re-measures on %s', (type) => {
        stubDevice();
        renderHook(() => useViewportGap());

        setInnerHeight(852);
        act(() => {
            window.dispatchEvent(new Event(type));
        });

        expect(gapVar()).toBe('0px');
    });

    it('re-measures when the app comes back from the background', () => {
        stubDevice();
        renderHook(() => useViewportGap());

        setInnerHeight(852);
        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        expect(gapVar()).toBe('0px');
    });

    it('stops listening once unmounted', () => {
        stubDevice();
        const { unmount } = renderHook(() => useViewportGap());
        unmount();

        act(() => {
            window.dispatchEvent(new Event('resize'));
        });

        expect(gapVar()).toBe('');
    });

    it('ignores installed PWAs that are not iOS home-screen apps (Android, desktop)', () => {
        stubDevice({ standalone: false, innerHeight: 780 });
        renderHook(() => useViewportGap());

        expect(gapVar()).toBe('0px');
    });

    it('stays at zero in landscape', () => {
        stubDevice({ portrait: false, innerHeight: 800 });
        renderHook(() => useViewportGap());

        expect(gapVar()).toBe('0px');
    });
});
