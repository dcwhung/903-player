/* 讀一個 API resource：data / error / loading + reload（舊 data 保留到新嗰份返嚟） */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Resource<T> {
    data: T | undefined;
    error: Error | undefined;
    loading: boolean;
    /** 連續叫：只有最新嗰次嘅結果會寫入 data / error（較舊嘅遲返嚟都唔會蓋過，AU-024） */
    reload: () => Promise<T | undefined>;
    /**
     * 即刻改已載入嘅 data（唔重讀；例如刪除後先喺列表拎走，之後 reload 照覆蓋）。
     * Method 寫法（bivariant）：test 嘅 resource(字面值) 照可以當 Resource<較闊型別> 用
     */
    mutate(update: (data: T | undefined) => T | undefined): void;
}

const asError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

/**
 * Reload token（AU-024，同 useCropSession 嘅做法）：每次開始 reload 遞增；
 * 回傳嘅 isLatest() 喺之後再有 reload 開始就變 false，遲返嚟嘅舊結果唔寫入 state
 */
const useReloadToken = () => {
    const tokenRef = useRef(0);
    return useCallback(() => {
        tokenRef.current += 1;
        const token = tokenRef.current;
        return () => token === tokenRef.current;
    }, []);
};

export const useResource = <T>(loader: () => Promise<T>, auto = true): Resource<T> => {
    const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({
        loading: auto,
    });
    const loaderRef = useRef(loader);
    useEffect(() => {
        loaderRef.current = loader;
    }, [loader]);
    const beginReload = useReloadToken();
    const reload = useCallback(async () => {
        const isLatest = beginReload();
        setState((s) => ({ ...s, loading: true }));
        try {
            const data = await loaderRef.current();
            if (isLatest()) setState({ data, loading: false });
            return data;
        } catch (error) {
            if (isLatest()) setState((s) => ({ ...s, error: asError(error), loading: false }));
            return undefined;
        }
    }, [beginReload]);
    const mutate = useCallback((update: (data: T | undefined) => T | undefined) => {
        setState((s) => ({ ...s, data: update(s.data) }));
    }, []);
    useEffect(() => {
        if (auto) void reload();
    }, [auto, reload]);
    return { data: state.data, error: state.error, loading: state.loading, reload, mutate };
};
