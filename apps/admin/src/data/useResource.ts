/* 讀一個 API resource：data / error / loading + reload（舊 data 保留到新嗰份返嚟） */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Resource<T> {
    data: T | undefined;
    error: Error | undefined;
    loading: boolean;
    reload: () => Promise<T | undefined>;
}

const asError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

export const useResource = <T>(loader: () => Promise<T>, auto = true): Resource<T> => {
    const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({
        loading: auto,
    });
    const loaderRef = useRef(loader);
    useEffect(() => {
        loaderRef.current = loader;
    }, [loader]);
    const reload = useCallback(async () => {
        setState((s) => ({ ...s, loading: true }));
        try {
            const data = await loaderRef.current();
            setState({ data, loading: false });
            return data;
        } catch (error) {
            setState((s) => ({ ...s, error: asError(error), loading: false }));
            return undefined;
        }
    }, []);
    useEffect(() => {
        if (auto) void reload();
    }, [auto, reload]);
    return { data: state.data, error: state.error, loading: state.loading, reload };
};
