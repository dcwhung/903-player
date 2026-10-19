import { renderHook } from '@testing-library/react';
import { useRefreshedOn } from './useRefreshedOn';

describe('useRefreshedOn', () => {
    it('reads again only when one of the keys changes', () => {
        const read = vi.fn(() => ({}));
        const { result, rerender } = renderHook(({ key }) => useRefreshedOn(read, [key]), {
            initialProps: { key: 1 },
        });
        const first = result.current;

        rerender({ key: 1 });
        expect(result.current).toBe(first);
        expect(read).toHaveBeenCalledTimes(1);

        rerender({ key: 2 });
        expect(result.current).not.toBe(first);
        expect(read).toHaveBeenCalledTimes(2);
    });
});
