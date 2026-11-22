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

interface PendingLoad {
    resolve: (value: string) => void;
    reject: (error: Error) => void;
}

/** 連續叫兩次 reload，兩個 loader 都未返（test 自己揀邊個先返） */
const startTwoReloads = () => {
    const pending: PendingLoad[] = [];
    const loader = () =>
        new Promise<string>((resolve, reject) => pending.push({ resolve, reject }));
    const { result } = renderHook(() => useResource(loader, false));
    const reloads: Promise<string | undefined>[] = [];
    act(() => {
        reloads.push(result.current.reload(), result.current.reload());
    });
    const settle = (index: number, finish: (load: PendingLoad) => void) =>
        act(async () => {
            const load = pending[index];
            if (load) finish(load);
            await reloads[index];
        });
    return { result, settle };
};

/** AU-024：較舊嘅 reload 遲返嚟，唔可以蓋過較新嗰次 */
describe('useResource reload ordering', () => {
    it('should keep the newest reload when an older one resolves late', async () => {
        const { result, settle } = startTwoReloads();
        await settle(1, (load) => load.resolve('new'));
        expect(result.current).toMatchObject({ data: 'new', loading: false });
        await settle(0, (load) => load.resolve('old'));
        expect(result.current).toMatchObject({ data: 'new', loading: false });
    });

    it('should stay loading until the newest reload returns', async () => {
        const { result, settle } = startTwoReloads();
        await settle(0, (load) => load.resolve('old'));
        expect(result.current).toMatchObject({ data: undefined, loading: true });
        await settle(1, (load) => load.resolve('new'));
        expect(result.current).toMatchObject({ data: 'new', loading: false });
    });

    it('should ignore the failure of an older reload once a newer one has loaded', async () => {
        const { result, settle } = startTwoReloads();
        await settle(1, (load) => load.resolve('new'));
        await settle(0, (load) => load.reject(new Error('stale')));
        expect(result.current).toMatchObject({ data: 'new', loading: false });
        expect(result.current.error).toBeUndefined();
    });
});
