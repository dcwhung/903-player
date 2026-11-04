import { act, renderHook } from '@testing-library/react';
import { useGridPager } from './useGridPager';

const PAGE_WIDTH = 300;
const PAGE_COUNT = 3;

/** 假 scroller：只要 onScroll / goTo 讀嘅欄位 */
const fakeScroller = (scrollLeft: number, clientWidth = PAGE_WIDTH) =>
    ({ scrollLeft, clientWidth, scrollTo: vi.fn() }) as unknown as HTMLDivElement;

const renderPager = (pageCount = PAGE_COUNT) =>
    renderHook(({ count }) => useGridPager(count), { initialProps: { count: pageCount } });

describe('useGridPager', () => {
    it('should start on the first page', () => {
        const { result } = renderPager();
        expect(result.current.index).toBe(0);
    });

    it('should round scrollLeft to the nearest page when scrolled', () => {
        const { result } = renderPager();
        result.current.scrollerRef.current = fakeScroller(PAGE_WIDTH * 1.6);
        act(() => result.current.onScroll());
        expect(result.current.index).toBe(2);
    });

    it('should keep the index when the scroller has no width yet', () => {
        const { result } = renderPager();
        result.current.scrollerRef.current = fakeScroller(PAGE_WIDTH * 2, 0);
        act(() => result.current.onScroll());
        expect(result.current.index).toBe(0);
    });

    it('should scroll to the page and select it when goTo is called', () => {
        const { result } = renderPager();
        const scroller = fakeScroller(0);
        result.current.scrollerRef.current = scroller;
        act(() => result.current.goTo(1));
        expect(scroller.scrollTo).toHaveBeenCalledWith(
            expect.objectContaining({ left: PAGE_WIDTH }),
        );
        expect(result.current.index).toBe(1);
    });

    it('should clamp the index to the last page when the page count shrinks', () => {
        const { result, rerender } = renderPager();
        result.current.scrollerRef.current = fakeScroller(0);
        act(() => result.current.goTo(2));
        rerender({ count: 2 });
        expect(result.current.index).toBe(1);
    });
});
