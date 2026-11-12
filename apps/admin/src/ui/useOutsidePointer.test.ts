import { renderHook } from '@testing-library/react';
import { useOutsidePointer } from './useOutsidePointer';

const pointerdownAdds = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.filter(([type]) => type === 'pointerdown').length;

describe('useOutsidePointer', () => {
    afterEach(() => vi.restoreAllMocks());

    it('should keep one listener across renders with a new inline handler and call the latest one (S-839)', () => {
        const inside = document.createElement('div');
        document.body.append(inside);
        const ref = { current: inside };
        const add = vi.spyOn(document, 'addEventListener');
        const calls: number[] = [];
        const { rerender } = renderHook(
            ({ n }) => useOutsidePointer(ref, true, () => calls.push(n)),
            {
                initialProps: { n: 1 },
            },
        );
        rerender({ n: 2 });
        rerender({ n: 3 });
        expect(pointerdownAdds(add)).toBe(1);
        document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        expect(calls).toEqual([3]);
        inside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        expect(calls).toEqual([3]);
        inside.remove();
    });
});
