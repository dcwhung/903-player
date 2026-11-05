import { act, renderHook } from '@testing-library/react';
import { HOME_TAB_STORAGE_KEY } from '../config/constants';
import { useHomeTab, type HomeTab } from './useHomeTab';

describe('useHomeTab', () => {
    it('should start on 節目 and remember the chosen tab', () => {
        const { result } = renderHook(() => useHomeTab(false));

        expect(result.current[0]).toBe('shows');
        act(() => result.current[1]('dramas'));
        expect(result.current[0]).toBe('dramas');
        expect(localStorage.getItem(HOME_TAB_STORAGE_KEY)).toBe('dramas');
    });

    it('should come back to 我的收藏 while there are bookmarks', () => {
        localStorage.setItem(HOME_TAB_STORAGE_KEY, 'saved');

        expect(renderHook(() => useHomeTab(true)).result.current[0]).toBe('saved');
    });

    it('should fall back to 節目 when 我的收藏 is stored but nothing is bookmarked', () => {
        localStorage.setItem(HOME_TAB_STORAGE_KEY, 'saved');
        const { result } = renderHook(() => useHomeTab(false));

        expect(result.current[0]).toBe('shows');
        expect(localStorage.getItem(HOME_TAB_STORAGE_KEY)).toBe('shows');
    });

    it('should jump back to 節目 when the last bookmark goes away on 我的收藏', () => {
        const { result, rerender } = renderHook(({ saved }) => useHomeTab(saved), {
            initialProps: { saved: true },
        });
        act(() => result.current[1]('saved'));

        rerender({ saved: false });
        expect(result.current[0]).toBe('shows');
        expect(localStorage.getItem(HOME_TAB_STORAGE_KEY)).toBe('shows');
    });

    it('should ignore unknown stored values', () => {
        localStorage.setItem(HOME_TAB_STORAGE_KEY, 'radio');

        const tab: HomeTab = renderHook(() => useHomeTab(true)).result.current[0];
        expect(tab).toBe('shows');
    });
});

describe('useHomeTab after falling back', () => {
    it('should stay on 節目 when a bookmark is added again later (e.g. from the wide player card)', () => {
        localStorage.setItem(HOME_TAB_STORAGE_KEY, 'saved');
        const { result, rerender } = renderHook(({ saved }) => useHomeTab(saved), {
            initialProps: { saved: false },
        });

        rerender({ saved: true });
        expect(result.current[0]).toBe('shows');
    });
});
