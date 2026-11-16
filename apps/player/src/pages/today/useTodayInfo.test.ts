import { act, renderHook } from '@testing-library/react';
import { TODAY_INFO_SEEN_STORAGE_KEY } from '../../config/constants';
import { useTodayInfoExpanded } from './useTodayInfo';

describe('useTodayInfoExpanded', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    it('should start expanded on the first visit with info and remember it was seen', () => {
        const { result } = renderHook(() => useTodayInfoExpanded(true));
        expect(result.current.expanded).toBe(true);
        expect(localStorage.getItem(TODAY_INFO_SEEN_STORAGE_KEY)).not.toBeNull();
    });

    it('should start collapsed once the info has been seen', () => {
        localStorage.setItem(TODAY_INFO_SEEN_STORAGE_KEY, '1');
        const { result } = renderHook(() => useTodayInfoExpanded(true));
        expect(result.current.expanded).toBe(false);
    });

    it('should not use up the first visit while there is no info yet', () => {
        const { result, rerender } = renderHook(({ hasInfo }) => useTodayInfoExpanded(hasInfo), {
            initialProps: { hasInfo: false },
        });
        expect(localStorage.getItem(TODAY_INFO_SEEN_STORAGE_KEY)).toBeNull();
        rerender({ hasInfo: true });
        expect(result.current.expanded).toBe(true);
    });

    it('should toggle', () => {
        localStorage.setItem(TODAY_INFO_SEEN_STORAGE_KEY, '1');
        const { result } = renderHook(() => useTodayInfoExpanded(true));
        act(() => result.current.toggle());
        expect(result.current.expanded).toBe(true);
        act(() => result.current.toggle());
        expect(result.current.expanded).toBe(false);
    });

    it('should still expand when storage is blocked', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const { result } = renderHook(() => useTodayInfoExpanded(true));
        expect(result.current.expanded).toBe(true);
    });
});
