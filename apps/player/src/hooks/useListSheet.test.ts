import { act, renderHook } from '@testing-library/react';
import { useListSheet } from './useListSheet';

describe('useListSheet', () => {
    it('should start closed and toggle / close from the list button', () => {
        const { result } = renderHook(() => useListSheet(undefined));
        expect(result.current.open).toBe(false);

        act(() => result.current.toggle());
        expect(result.current.open).toBe(true);
        act(() => result.current.toggle());
        expect(result.current.open).toBe(false);
        act(() => result.current.toggle());
        act(() => result.current.close());
        expect(result.current.open).toBe(false);
    });

    it('should open once for each new focusKey and stay closed after the user closes it', () => {
        const { result, rerender } = renderHook(({ key }) => useListSheet(key), {
            initialProps: { key: 'a' as string | undefined },
        });
        expect(result.current.open).toBe(true);

        act(() => result.current.close());
        rerender({ key: 'a' });
        expect(result.current.open).toBe(false);

        rerender({ key: 'b' });
        expect(result.current.open).toBe(true);
    });
});
