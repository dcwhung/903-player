import { act, renderHook, waitFor } from '@testing-library/react';
import { stubCanvas, stubImages } from '../../../tests/fakeBannerImage';
import { useAspectRatio, useBannerEdges } from './useBannerEdges';

const WIDTH = 300;
const HEIGHT = 200;

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('useBannerEdges', () => {
    it('should give the edges once the image has been read', async () => {
        stubCanvas([1, 2, 3]);
        const images = stubImages();

        const { result } = renderHook(() => useBannerEdges('/hook-first.png'));
        expect(result.current).toBeNull();
        act(() => images[0]?.onload?.());

        await waitFor(() => expect(result.current).not.toBeNull());
    });

    it('should drop the old edges straight away when the src changes', async () => {
        stubCanvas([1, 2, 3]);
        const images = stubImages();
        const { result, rerender } = renderHook(({ src }) => useBannerEdges(src), {
            initialProps: { src: '/hook-old.png' },
        });
        act(() => images[0]?.onload?.());
        await waitFor(() => expect(result.current).not.toBeNull());

        rerender({ src: '/hook-new.png' });

        // 新圖未讀完，唔好用住舊圖嘅邊色
        expect(result.current).toBeNull();
    });

    it('should ignore a read that finishes after unmount', async () => {
        stubCanvas([1, 2, 3]);
        const images = stubImages();
        const { result, unmount } = renderHook(() => useBannerEdges('/hook-unmount.png'));

        unmount();
        await act(async () => images[0]?.onload?.());

        expect(result.current).toBeNull();
    });
});

/** 假 ResizeObserver：記住 callback，test 自己觸發 */
const stubResizeObserver = () => {
    const observer = { trigger: () => {}, disconnect: vi.fn() };
    vi.stubGlobal(
        'ResizeObserver',
        class {
            constructor(callback: () => void) {
                observer.trigger = callback;
            }
            observe = vi.fn();
            disconnect = observer.disconnect;
        },
    );
    return observer;
};

/** 有指定 clientWidth / clientHeight 嘅元素 ref */
const sizedRef = (width: number, height: number) => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: width });
    Object.defineProperty(el, 'clientHeight', { value: height });
    return { current: el };
};

describe('useAspectRatio', () => {
    it('should give width ÷ height whenever the element resizes', () => {
        const observer = stubResizeObserver();
        const { result } = renderHook(() => useAspectRatio(sizedRef(WIDTH, HEIGHT)));
        expect(result.current).toBeNaN();

        act(() => observer.trigger());

        expect(result.current).toBe(WIDTH / HEIGHT);
    });

    it('should stay NaN while the element has no height', () => {
        const observer = stubResizeObserver();
        const { result } = renderHook(() => useAspectRatio(sizedRef(WIDTH, 0)));

        act(() => observer.trigger());

        expect(result.current).toBeNaN();
    });

    it('should stop observing on unmount', () => {
        const observer = stubResizeObserver();
        const ref = sizedRef(WIDTH, HEIGHT);
        const { unmount } = renderHook(() => useAspectRatio(ref));

        unmount();

        expect(observer.disconnect).toHaveBeenCalled();
    });

    it('should stay NaN when there is no element', () => {
        stubResizeObserver();

        const { result } = renderHook(() => useAspectRatio({ current: null }));

        expect(result.current).toBeNaN();
    });
});
