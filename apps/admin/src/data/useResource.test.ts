import { act, renderHook, waitFor } from '@testing-library/react';
import { useResource } from './useResource';

describe('useResource', () => {
    it('should update the loaded data in place with mutate, without reloading', async () => {
        const loader = vi.fn(() => Promise.resolve(['a', 'b']));
        const { result } = renderHook(() => useResource(loader));
        await waitFor(() => expect(result.current.data).toEqual(['a', 'b']));
        act(() => result.current.mutate((list) => list?.filter((item) => item !== 'a')));
        expect(result.current.data).toEqual(['b']);
        expect(loader).toHaveBeenCalledOnce();
    });

    it('should let a later reload replace the mutated data', async () => {
        let data = ['a'];
        const { result } = renderHook(() => useResource(() => Promise.resolve(data)));
        await waitFor(() => expect(result.current.data).toEqual(['a']));
        act(() => result.current.mutate(() => []));
        data = ['c'];
        await act(async () => void (await result.current.reload()));
        expect(result.current.data).toEqual(['c']);
    });
});
